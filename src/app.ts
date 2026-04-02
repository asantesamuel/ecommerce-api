import 'reflect-metadata';
import express, { Express } from 'express';
import cors                 from 'cors';
import helmet               from 'helmet';
import morgan               from 'morgan';
import swaggerUi            from 'swagger-ui-express';
import path                 from 'path';
import { RegisterRoutes }   from './routes';
import { errorHandler }     from './middlewares/errorHandler';
import {
  authRateLimiter,
  loginRateLimiter,
} from './middlewares/rateLimiter';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
  app.use(morgan('dev'));

  // Raw body for Paystack webhook signature verification
  // Must come before express.json()
  app.use(
    '/payments/webhook',
    express.raw({ type: 'application/json' }),
    (req: any, _res: any, next: any) => {
      // Parse body back to object after capturing raw bytes
      req.body = JSON.parse(req.body.toString());
      next();
    }
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/auth', authRateLimiter);
  app.use('/auth/login', loginRateLimiter);

  const swaggerDocument = require(
    path.join(__dirname, 'public/swagger.json')
  );
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  RegisterRoutes(app);
  app.use(errorHandler);

  return app;
}