const express = require("express");
const { getUsersByRole, deleteUserById } = require("../controllers/users");
const { protect, authorize } = require("../middlewares/auth");

const router = express.Router();

router.get("/:role", protect, authorize("admin"), getUsersByRole);
router.delete("/:id", protect, authorize("admin"), deleteUserById);

module.exports = router;
