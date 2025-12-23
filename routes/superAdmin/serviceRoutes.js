const express = require('express');
const router = express.Router();
const { addService, getAllServices, getServiceById } = require('../../controller/superAdmin/serviceController');
const { updateService } = require('../../controller/superAdmin/serviceUpdate');
const verifyToken = require('../../middlewares/verifyToken');

// POST /admin/addService
router.post('/admin/addService', verifyToken, addService);
router.get('/admin/get/all/services', verifyToken,getAllServices);
router.get('/admin/get/service/by/id/:id', verifyToken,getServiceById);
router.put('/admin/update/service/:id', verifyToken, updateService);

module.exports = router;
