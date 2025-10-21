import logger from '@/utils/logger';

export function setupGlobalErrorHandlers() {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', error);
    logger.warn('Application is shutting down due to uncaught exception');
    process.exitCode = 1; 
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection', reason);
    logger.warn('Unhandled rejection occurred, but the application will continue running');
  });
}
