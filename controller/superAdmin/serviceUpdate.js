const Service = require("../../model/superAdmin/service");

exports.updateService = async (req, res) => {
  // console.log("req.body",req.body)
  try {
    const { id } = req.params;
    const {
      name,
      description,
      amount,
      igst,
      cgst,
      sgst,
      hsnCode,
      status,
      type, // <-- NEW
      totalTax,
      totalAmount,
    } = req.body;

    if (!name || !amount || !hsnCode) {
      return res
        .status(400)
        .json({ message: "Name, Amount, and HSN Code are required." });
    }
    if (igst && (cgst || sgst)) {
      return res
        .status(400)
        .json({
          message: "You can only apply either IGST or CGST+SGST, not both.",
        });
    }

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    service.name = name;
    service.description = description;
    service.amount = amount;
    service.igstPer = igst || 0;
    service.cgstPer = cgst || 0;
    service.sgstPer = sgst || 0;
    service.hsnCode = hsnCode;
    service.status = status;
    service.type = type; // <-- NEW
    service.totalTax = totalTax;
    service.totalAmount = totalAmount;

    await service.save();

    res.status(200).json({ message: "Service updated successfully", service });
  } catch (error) {
    console.error("Update Service Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
