var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const taskSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    date:{
        type:String,
        required:true,
        default: Date.now
        
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Usuario",
        required:true
    }
}, {
    timestamps:true
});

module.exports = mongoose.model('Task', taskSchema);