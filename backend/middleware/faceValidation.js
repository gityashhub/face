export const validateFaceData = (req, res, next) => {
  const { faceDescriptor } = req.body;
  
  if (faceDescriptor) {
    try {
      // Parse if it's a string
      const descriptor = typeof faceDescriptor === 'string' 
        ? JSON.parse(faceDescriptor) 
        : faceDescriptor;

      // Validate descriptor format
      if (!Array.isArray(descriptor)) {
        return res.status(400).json({
          success: false,
          message: 'Face descriptor must be an array'
        });
      }

      if (descriptor.length !== 128) {
        return res.status(400).json({
          success: false,
          message: 'Face descriptor must have exactly 128 dimensions'
        });
      }

      // Validate that all values are numbers
      if (!descriptor.every(val => typeof val === 'number' && !isNaN(val))) {
        return res.status(400).json({
          success: false,
          message: 'Face descriptor must contain only valid numbers'
        });
      }

      // Store parsed descriptor back in request
      req.body.faceDescriptor = descriptor;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid face descriptor format'
      });
    }
  }
  
  next();
};
