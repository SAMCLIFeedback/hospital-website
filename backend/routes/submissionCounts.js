const express = require('express');
const router = express.Router();
const InternalFeedback = require('../models/InternalFeedback'); 
const ExternalFeedback = require('../models/ExternalFeedback'); 

const getCurrentMonthDateStrings = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0); 

    const pad = (num) => num < 10 ? '0' + num : num;

    const startOfMonth = `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-${pad(firstDay.getDate())}`;
    const endOfMonth = `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`;

    return { startOfMonth, endOfMonth };
};

router.get('/feedback-count-month', async (req, res) => {
    try {
        const { startOfMonth, endOfMonth } = getCurrentMonthDateStrings();

        const internalCount = await InternalFeedback.countDocuments({
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const externalCount = await ExternalFeedback.countDocuments({
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const totalCount = internalCount + externalCount;

        res.json({ count: totalCount });

    } catch (error) {
        console.error('Error fetching feedback count:', error);
        res.status(500).json({ message: 'Error fetching feedback count', error: error.message });
    }
});

module.exports = router;