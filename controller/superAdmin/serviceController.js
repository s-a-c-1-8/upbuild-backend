const Service = require("../../model/superAdmin/service");

// Add a new service
exports.addService = async (req, res) => {
  try {
    const {
      name,
      description,
      amount,
      igst,
      cgst,
      sgst,
      hsnCode,
      status,
      type, // <— NEW
      totalTax,
      totalAmount,
    } = req.body;

    // Basic validation
    if (!name || !amount || !hsnCode) {
      return res
        .status(400)
        .json({ message: "Name, Amount, and HSN Code are required." });
    }
    if (igst && (cgst || sgst)) {
      return res.status(400).json({
        message: "You can only apply either IGST or CGST+SGST, not both.",
      });
    }

    const service = new Service({
      name,
      description,
      amount,
      igstPer: igst || 0,
      cgstPer: cgst || 0,
      sgstPer: sgst || 0,
      hsnCode,
      status,
      type, // <— persist type
      totalTax,
      totalAmount,
    });

    await service.save();

    res.status(201).json({ message: "Service added successfully", service });
  } catch (error) {
    console.error("Add Service Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all services
exports.getAllServices = async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 }); // newest first
    res.status(200).json({ services });
  } catch (error) {
    console.error("Get All Services Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get service by ID
exports.getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID presence
    if (!id) {
      return res.status(400).json({ message: "Service ID is required." });
    }

    const service = await Service.findById(id);

    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }

    res.status(200).json({ service });
  } catch (error) {
    console.error("Get Service By ID Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
