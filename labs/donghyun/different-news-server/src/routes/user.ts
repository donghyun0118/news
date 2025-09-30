
import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db';

const router = Router();

// User signup
router.post('/signup', async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  try {
    // Check if user already exists
    const [existingUsers]: any = await pool.query(
      'SELECT * FROM tn_user WHERE name = ? OR email = ?',
      [name, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Name or email already exists.' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    await pool.query(
      'INSERT INTO tn_user (name, email, password) VALUES (?, ?, ?)',
      [name, email, passwordHash]
    );

    res.status(201).json({ message: 'User created successfully.' });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// User login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    // Find user by email
    const [users]: any = await pool.query('SELECT * FROM tn_user WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = users[0];

    // Check password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Generate JWT
    // TODO: Move JWT_SECRET to environment variables
    const jwtSecret = 'your_super_secret_jwt_key';
    const token = jwt.sign({ userId: user.id, name: user.name }, jwtSecret, { expiresIn: '1h' });

    res.json({ token });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
