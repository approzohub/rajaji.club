import swaggerJSDoc from 'swagger-jsdoc';

const PORT = process.env.PORT || 4000;

export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Playwin API',
      version: '1.0.0',
      description: 'API documentation for Playwin backend',
    },
    servers: [
      { url: `http://localhost:${PORT}` }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['src/routes/**/*.ts', 'src/controllers/**/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions); 