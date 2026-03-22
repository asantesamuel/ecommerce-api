import 'reflect-metadata';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { RegisterRoutes } from './routes';
import { errorHandler } from './middlewares/errorHandler';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
  app.use(morgan('dev'));

  // Raw body must come before express.json for Stripe webhooks
  app.use(
    '/payments/webhook',
    express.raw({ type: 'application/json' })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Swagger UI
  const swaggerDocument = require(
    path.join(__dirname, 'public/swagger.json')
  );
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // tsoa generated routes
  RegisterRoutes(app);

  // Global error handler — must be last
  app.use(errorHandler);

  return app;
}