import Task from '../models/task.model.js';

export const getTasks = async (req, res) =>{
    try {
        const tasks = await Task.find()
        //traemos las tareas en orden de ultima fecha
        tasks.sort((a,b) => b.createdAt - a.createdAt);
        res.json({
            ok: true,
            tasks
        });
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener tareas'})
    }
};
export const getTasksByUser = async (req, res) =>{
    try {
        const tasks = await Task.find({
        user: req.params.id
        }).populate('user')
        res.json({
            ok: true,
            tasks
        });
    } catch (error) {
        return res.status(404).json({ message: 'No tasks found' });
    }
};
export const createTask = async (req, res) =>{
    try {
        const {title, description, date} = req.body;
        const newTask = new Task({
            title, 
            description, 
            date,
            user: req.user.id
        });
        const saveTask =  await newTask.save();
        res.json(saveTask);
    } catch (error) {
        return res.status(400).json({message: error.message});
    }

};
export const getTask = async (req, res) =>{
  try {
     const task = await Task.findById(req.params.id)
   if(!task) return res.status(404).json({msg: 'Task not found'})
    res.json({
            ok: true,
            task
        });

  } catch (error) {
    return res.status(404).json({msg: 'Task not found'})
  }
};
export const deleteTask = async (req, res) =>{
    try {
        const task = await Task.findByIdAndDelete(req.params.id)
        if(!task) return res.status(404).json({msg: 'Task not found'})
        return res.sendStatus(204);
    } catch (error) {
        return res.status(404).json({msg: 'Task not found'})
    }
};
export const updateTask = async (req, res) =>{
    try {
        const task = await Task.findByIdAndUpdate(req.params.id, req.body, {new: true})
        if(!task) return res.status(404).json({msg: 'Task not found'})
        res.json({
            ok: true,
            task
        });
    } catch (error) {
        return res.status(404).json({msg: 'Task not found'})
    }
};