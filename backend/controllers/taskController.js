// controllers/taskController.js
import { validationResult } from 'express-validator';
import Task from '../models/Task.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private (Admin)
export const createTask = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors details:', errors.array());
      console.log('Request body:', req.body);
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Create the task
    const taskData = {
      title: req.body.title,
      description: req.body.description,
      assignedTo: req.body.assignedTo,
      assignedBy: req.user.id,
      project: req.body.project || '',
      priority: req.body.priority || 'Medium',
      dueDate: req.body.dueDate,
      category: req.body.category || 'Other',
      estimatedHours: req.body.estimatedHours || 0,
      status: 'Not Started',
      progress: 0
    };

    console.log('Creating task with data:', taskData);

    const task = await Task.create(taskData);

    // Populate the created task
    const populatedTask = await Task.findById(task._id)
      .populate([
        {
          path: 'assignedTo',
          populate: {
            path: 'user',
            select: 'name email employeeId'
          }
        },
        {
          path: 'assignedBy',
          select: 'name email'
        }
      ]);

    console.log('Task created successfully:', populatedTask._id);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: populatedTask
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private

export const getTasks = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      priority, 
      project, 
      assignedTo, 
      search,
      category,
      overdue
    } = req.query;

    let query = {};

    // Build query based on user role
    if (req.user.role === 'employee') {
      // Employees can only see their own tasks
      const employee = await Employee.findOne({ user: req.user.id });
      console.log('Employee lookup - User ID:', req.user.id);
      console.log('Employee found:', employee);
      
      if (employee) {
        query.assignedTo = employee._id;
        console.log('Employee query filter:', query);
      } else {
        console.log('No employee record found for user:', req.user.id);
        return res.json({
          success: true,
          tasks: [],
          pagination: {
            currentPage: parseInt(page),
            totalPages: 0,
            totalTasks: 0,
            hasNext: false,
            hasPrev: false
          }
        });
      }
    }

    // Apply other filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (project) query.project = project;
    if (category) query.category = category;
    if (assignedTo && req.user.role === 'admin') query.assignedTo = assignedTo;

    // Handle overdue filter
    if (overdue === 'true') {
      query.dueDate = { $lt: new Date() };
      query.status = { $nin: ['Completed', 'Cancelled'] };
    }

    // Handle search - move to database level
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { project: searchRegex }
      ];
    }

    console.log('Final MongoDB query:', query);

    // Execute the query
    const tasks = await Task.find(query)
      .populate([
        {
          path: 'assignedTo',
          populate: {
            path: 'user',
            select: 'name email employeeId'
          }
        },
        {
          path: 'assignedBy',
          select: 'name email'
        }
      ])
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    console.log('Found tasks count:', tasks.length);

    const total = await Task.countDocuments(query);
    console.log('Total tasks matching query:', total);

    res.json({
      success: true,
      tasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalTasks: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// @desc    Get task by ID
// @route   GET /api/tasks/:id
// @access  Private
export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate([
        {
          path: 'assignedTo',
          populate: {
            path: 'user',
            select: 'name email employeeId'
          }
        },
        {
          path: 'assignedBy',
          select: 'name email'
        },
        {
          path: 'comments.user',
          select: 'name email'
        }
      ]);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions - employees can only view their own tasks
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee || task.assignedTo._id.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      task
    });

  } catch (error) {
    console.error('Get task by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
export const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee || task.assignedTo.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      
      // Employees can only update specific fields
      const allowedUpdates = ['status', 'progress', 'actualHours', 'comments', 'subtasks'];
      const updates = {};
      
      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key];
        }
      });
      
      req.body = updates;
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
      {
        path: 'assignedTo',
        populate: {
          path: 'user',
          select: 'name email employeeId'
        }
      },
      {
        path: 'assignedBy',
        select: 'name email'
      }
    ]);

    res.json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask
    });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private (Admin)
export const deleteTask = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
// @access  Private
export const addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee || task.assignedTo.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    await task.addComment(req.user.id, text.trim());

    // Populate and return updated task
    const updatedTask = await Task.findById(req.params.id)
      .populate([
        {
          path: 'assignedTo',
          populate: {
            path: 'user',
            select: 'name email employeeId'
          }
        },
        {
          path: 'comments.user',
          select: 'name email'
        }
      ]);

    res.json({
      success: true,
      message: 'Comment added successfully',
      task: updatedTask
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update task progress
// @route   PUT /api/tasks/:id/progress
// @access  Private
export const updateProgress = async (req, res) => {
  try {
    const { progress } = req.body;

    if (progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: 'Progress must be between 0 and 100'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee || task.assignedTo.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    await task.updateProgress(progress);

    const updatedTask = await Task.findById(req.params.id)
      .populate([
        {
          path: 'assignedTo',
          populate: {
            path: 'user',
            select: 'name email employeeId'
          }
        }
      ]);

    res.json({
      success: true,
      message: 'Progress updated successfully',
      task: updatedTask
    });

  } catch (error) {
    console.error('Update progress error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Change task status
// @route   PUT /api/tasks/:id/status
// @access  Private
export const changeStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['Not Started', 'In Progress', 'Review', 'Completed', 'On Hold', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee || task.assignedTo.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    await task.changeStatus(status);

    const updatedTask = await Task.findById(req.params.id)
      .populate([
        {
          path: 'assignedTo',
          populate: {
            path: 'user',
            select: 'name email employeeId'
          }
        }
      ]);

    res.json({
      success: true,
      message: 'Status updated successfully',
      task: updatedTask
    });

  } catch (error) {
    console.error('Change status error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get task statistics
// @route   GET /api/tasks/stats
// @access  Private
export const getTaskStats = async (req, res) => {
  try {
    let query = {};

    // If employee, only show their stats
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (employee) {
        query.assignedTo = employee._id;
      }
    }

    const totalTasks = await Task.countDocuments(query);
    const inProgressTasks = await Task.countDocuments({ ...query, status: 'In Progress' });
    const completedTasks = await Task.countDocuments({ ...query, status: 'Completed' });
    const overdueTasks = await Task.countDocuments({
      ...query,
      status: { $nin: ['Completed', 'Cancelled'] },
      dueDate: { $lt: new Date() }
    });

    // Project-wise task distribution
    const projectStats = await Task.aggregate([
      { $match: query },
      { $group: { _id: '$project', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Priority-wise distribution
    const priorityStats = await Task.aggregate([
      { $match: query },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Status-wise distribution
    const statusStats = await Task.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      stats: {
        total: totalTasks,
        inProgress: inProgressTasks,
        completed: completedTasks,
        overdue: overdueTasks,
        projectDistribution: projectStats,
        priorityDistribution: priorityStats,
        statusDistribution: statusStats
      }
    });

  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Toggle subtask completion
// @route   PUT /api/tasks/:id/subtasks/:subtaskId
// @access  Private
export const toggleSubtask = async (req, res) => {
  try {
    const { id: taskId, subtaskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee || task.assignedTo.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    await task.toggleSubtask(subtaskId);

    const updatedTask = await Task.findById(taskId)
      .populate([
        {
          path: 'assignedTo',
          populate: {
            path: 'user',
            select: 'name email employeeId'
          }
        }
      ]);

    res.json({
      success: true,
      message: 'Subtask updated successfully',
      task: updatedTask
    });

  } catch (error) {
    console.error('Toggle subtask error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};