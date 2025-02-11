import asyncHandler from 'express-async-handler';
import FileRequest from '../models/fileRequestModel.js';
import crypto from 'crypto';
import axios from 'axios';
import FormData from 'form-data';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sendEmail from '../utils/emailUtils.js';
import { 
  encryptForIPFS, 
  generateEncryptionKey, 
  decryptFile
} from '../utils/encryptionUtils.js';
import { examApprovalTemplate } from '../utils/emailTemplates.js';
import { createLogger } from '../utils/logger.js';
dotenv.config();

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read contractABI.json using ES modules
const contractABI = JSON.parse(
  await readFile(join(__dirname, '../contractABI.json'), 'utf8')
);

// Contract setup - Updated for ethers v6
const contractAddress = process.env.CONTRACT_ADDRESS;
const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(contractAddress, contractABI, wallet);

// Add Pinata configuration
const PINATA_API_KEY = process.env.PINATA_API_KEY;

const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const PINATA_JWT = process.env.PINATA_JWT;

const logger = createLogger('adminController');

// Function to upload encrypted data to Pinata
const uploadEncryptedToPinata = async (jsonData) => {
  try {
    // Generate a new encryption key for IPFS
    const ipfsEncryptionKey = generateEncryptionKey();
    
    // Encrypt the data
    const encryptedData = encryptForIPFS(jsonData, ipfsEncryptionKey);
    
    const data = JSON.stringify({
      pinataOptions: {
        cidVersion: 1
      },
      pinataMetadata: {
        name: `exam_${Date.now()}`,
        keyvalues: {
          type: "encrypted_exam",
          timestamp: encryptedData.timestamp.toString()
        }
      },
      pinataContent: encryptedData // Upload encrypted content
    });

    const config = {
      method: 'post',
      url: 'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PINATA_JWT}`
      },
      data: data
    };

    const response = await axios(config);
    return {
      ipfsHash: response.data.IpfsHash,
      encryptionKey: ipfsEncryptionKey
    };
  } catch (error) {
    console.error('Pinata upload error:', error);
    throw new Error('Failed to upload encrypted data to IPFS');
  }
};

// Get all file requests
const getRequests = asyncHandler(async (req, res) => {
  try {
    const requests = await FileRequest.find()
      .populate('institute', 'name email')
      .sort('-createdAt')
      .lean();

    // Format the response data
    const formattedRequests = requests.map(request => ({
      _id: request._id,
      fileName: request.examName, // Using examName as fileName
      institute: request.institute,
      status: request.status,
      createdAt: request.createdAt,
      totalQuestions: request.totalQuestions,
      resultsReleased: request.resultsReleased
    }));

    res.json(formattedRequests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500);
    throw new Error('Failed to fetch requests');
  }
});

// Get dashboard statistics
const getDashboardStats = asyncHandler(async (req, res) => {
  try {
    const [
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests
    ] = await Promise.all([
      FileRequest.countDocuments(),
      FileRequest.countDocuments({ status: 'pending' }),
      FileRequest.countDocuments({ status: 'approved' }),
      FileRequest.countDocuments({ status: 'rejected' })
    ]);

    res.json({
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500);
    throw new Error('Failed to fetch dashboard statistics');
  }
});

// Update request status
const updateRequestStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, adminComment } = req.body;
  let ipfsHash;

  try {
    const fileRequest = await FileRequest.findById(id)
      .populate('institute', 'name email')
      .exec();
    
    if (!fileRequest) {
      res.status(404);
      throw new Error('Request not found');
    }

    if (!['approved', 'rejected'].includes(status)) {
      res.status(400);
      throw new Error('Invalid status');
    }

    if (!fileRequest.institute || !fileRequest.institute.email) {
      throw new Error('Institute details not found');
    }

    // Only process IPFS upload for approved requests
    if (status === 'approved') {
      try {
        logger.info('Starting approval process...');
        
        let decryptedData;
        try {
          logger.info('Decrypting stored data...');
          decryptedData = decryptFile(fileRequest.encryptedData, fileRequest.encryptionKey);
          logger.info('Successfully decrypted data');
        } catch (decryptError) {
          logger.error('Decryption failed:', decryptError);
          throw new Error(`Decryption failed: ${decryptError.message}`);
        }
        
        logger.info('Encrypting for IPFS...');
        const encryptedForIPFS = encryptForIPFS(decryptedData, fileRequest.ipfsEncryptionKey);
        logger.info('Successfully encrypted for IPFS');
        
        const pinataData = JSON.stringify({
          pinataOptions: { cidVersion: 1 },
          pinataMetadata: {
            name: `exam_${fileRequest.examName}_${Date.now()}`,
            keyvalues: { type: "encrypted_exam" }
          },
          pinataContent: encryptedForIPFS
        });

        logger.info('Uploading to Pinata...');
        const pinataResponse = await axios.post(
          'https://api.pinata.cloud/pinning/pinJSONToIPFS',
          pinataData,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.PINATA_JWT}`
            }
          }
        );

        ipfsHash = pinataResponse.data.IpfsHash;
        fileRequest.ipfsHash = ipfsHash;
        logger.info('Successfully uploaded to IPFS:', ipfsHash);
      } catch (error) {
        logger.error('IPFS upload error:', error);
        throw new Error(`IPFS upload failed: ${error.message}`);
      }
    }

    fileRequest.status = status;
    fileRequest.adminComment = adminComment;
    fileRequest.reviewedAt = Date.now();
    fileRequest.reviewedBy = req.user._id;

    await fileRequest.save();

    // Send email notification
    try {
      await sendEmail({
        to: fileRequest.institute.email,
        subject: `Exam Request ${status.toUpperCase()}`,
        html: examApprovalTemplate({
          examName: fileRequest.examName,
          status,
          ipfsHash,
          ipfsEncryptionKey: fileRequest.ipfsEncryptionKey,
          totalQuestions: fileRequest.totalQuestions,
          timeLimit: fileRequest.timeLimit,
          adminComment
        }, status)
      });
      
      logger.info('Email sent successfully');
    } catch (emailError) {
      logger.error('Email sending error:', emailError);
    }

    res.json({
      message: `Request ${status}`,
      requestId: fileRequest._id,
      status: fileRequest.status,
      ipfsHash: status === 'approved' ? ipfsHash : undefined
    });

  } catch (error) {
    logger.error('Status update error:', error);
    res.status(500);
    throw new Error(`Failed to process ${status}: ${error.message}`);
  }
});

export {
  getRequests,
  updateRequestStatus,
  getDashboardStats
}; 