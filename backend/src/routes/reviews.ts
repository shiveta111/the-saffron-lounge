import express, { Router } from 'express';
const router: Router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Reviews routes' });
});

export default router;