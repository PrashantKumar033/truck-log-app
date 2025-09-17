import mongoose from 'mongoose';

const entrySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  truckNo: { type: String, required: true },
  loadLocation: { type: String, required: true },
  dieselLiters: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  notes: { type: String }
}, { timestamps: true });

const Entry = mongoose.model('Entry', entrySchema);
export default Entry;
