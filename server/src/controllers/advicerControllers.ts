import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Specialization from '../models/Specialization';
import Proposal from '../models/Proposal';
import { generateToken } from '../utils/auth'; // Import generateToken
import axios from 'axios';

export const registration = async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  const specializations = JSON.parse(req.body.specializations);
  const profileImage = (req as any).file?.filename;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      profileImage,
      specializations,
      isApproved: false,
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully. Awaiting admin approval.' });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isApproved) {
      return res.status(403).json({ message: 'Your account has not been approved by the admin yet.' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user); // Generate the JWT using the utility function

    res.status(200).json({ token, user });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Something went wrong', error: (error as Error).message });
  }
};

const accessKey = 'fhEyIAZQfUaZp0EWjg1F48uyRSqFAYsQwSdvGmHf11RSsjLRiYViPo7zY41V';
const environmentId = 'xrFOxf2xvbLZW9SVeF1Y';

export const getToken = async (req: Request, res: Response) => {
  // Define user data (replace with real data from your database or session)
  const user = {
      id: 'DanielDeTorres-123',
      email: 'daniel@gmail.com',
      name: 'Daniel De Torres'
  };

  const payload = {
      aud: environmentId,
      sub: user.id,
      user: {
          email: user.email,
          name: user.name
      },
      auth: {
          'collaboration': {
              '*': {
                  'role': 'writer'
              }
          }
      }
  };

  try {
      // Generate JWT token
      const token = jwt.sign(payload, accessKey, { algorithm: 'HS256', expiresIn: '24h' });
      res.send(token);
  } catch (error) {
      res.status(500).send('Error generating token');
  }
};


/* admin & advicer */

// Get all proposals
export const getAllProposals = async (req: Request, res: Response) => {
  try {
    const proposals = await Proposal.find().populate('userId', 'name email');
    res.json(proposals);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
/* admin & advicer */
// Get proposals by user ID
export const getProposalsByUserId = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const proposals = await Proposal.find({ userId }).populate('userId', 'name email');
    res.json(proposals);
  } catch (error) {
    console.error('Error fetching proposals by user ID:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
/* admin & advicer */
  export const listStudentsManage = async (req: Request, res: Response) => {
  const { advisorId } = req.params;

  try {
    const students = await User.find({ chosenAdvisor: advisorId, advisorStatus: { $exists: false } });
    res.status(200).json({ students });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/* admin & advicer */
export const updateStatusStudent = async (req: Request, res: Response) => {
  const { studentId, status } = req.body;

  if (!studentId || !status) {
    return res.status(400).json({ message: 'studentId and status are required' });
  }

  try {
    await User.findByIdAndUpdate(studentId, { advisorStatus: status });
    res.status(200).json({ message: 'Student status updated successfully' });
  } catch (error) {
    console.error('Error updating student status:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/* Specialization to choose */
export const getSpecializations = async (req: Request, res: Response) => {
  try {
    const specializations = await Specialization.find();
    res.status(200).json(specializations);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error });
  }
};


export const getAdviserStudents = async (req: Request, res: Response) => {
  const { advisorId } = req.params;

  try {
    const acceptedStudents = await User.find({ chosenAdvisor: advisorId, advisorStatus: 'accepted' });
    const declinedStudents = await User.find({ chosenAdvisor: advisorId, advisorStatus: 'declined' });
    const studentsToManage = await User.find({ chosenAdvisor: advisorId, advisorStatus: 'pending' || null });

    res.status(200).json({ acceptedStudents, declinedStudents, studentsToManage });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


export const respondToStudent = async (req: Request, res: Response) => {
  const { studentId, advisorId, status } = req.body;

  if (!studentId || !advisorId || !status) {
    return res.status(400).json({ message: 'studentId, advisorId, and status are required' });
  }

  try {
    const student = await User.findById(studentId);
    if (!student || !student.chosenAdvisor || student.chosenAdvisor.toString() !== advisorId) {
      return res.status(404).json({ message: 'Student not found or advisor mismatch' });
    }
    
    student.advisorStatus = status;
    await student.save();
    
    res.status(200).json({ message: `Student ${status} successfully` });
  } catch (error) {
    console.error('Error responding to student:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getPanelistStudents = async (req: Request, res: Response) => {
  const { advisorId } = req.params;

  try {
    const students = await User.find({ panelists: advisorId }).populate('panelists');
    res.status(200).json({ panelistStudents: students });
  } catch (error) {
    console.error('Error fetching panelist students:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

