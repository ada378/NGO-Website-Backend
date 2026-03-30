const express = require('express');
const router = express.Router();
const { createOrder, verifySignature, getKey } = require('../controllers/paymentController');

router.post('/create-order', createOrder);
router.post('/verify', verifySignature);
router.get('/key', getKey);

module.exports = router;
