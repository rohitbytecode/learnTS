import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const log = {
  info: (message: string, data?: any) => logger.info(data, message),
  warn: (message: string, data?: any) => logger.warn(data, message),
  error: (message: string, error?: any) => logger.error(error, message),
  debug: (message: string, data?: any) => logger.debug(data, message),
  fatal: (message: string, error?: any) => logger.fatal(error, message),
};

export const logAuth = {
  loginAttempt: (email: string, success: boolean, tenantId?: string) => {
    logger.info(
      {
        event: 'login_attempt',
        email,
        success,
        tenantId,
        timestamp: new Date().toISOString(),
      },
      `Login attempt: ${success ? 'SUCCESS' : 'FAILED'} for ${email}`,
    );
  },

  registration: (email: string, orgName: string) => {
    logger.info(
      {
        event: 'user_registration',
        email,
        orgName,
        timestamp: new Date().toISOString(),
      },
      `New organization registered: ${orgName} by ${email}`,
    );
  },
};

export const logUser = {
  created: (email: string, role: string, tenantId: string) => {
    logger.info(
      {
        event: 'user_created',
        email,
        role,
        tenantId,
        timestamp: new Date().toISOString(),
      },
      `User created: ${email} with role ${role}`,
    );
  },

  retrieved: (count: number, tenantId: string) => {
    logger.info(
      {
        event: 'users_retrieved',
        count,
        tenantId,
        timestamp: new Date().toISOString(),
      },
      `Retrieved ${count} users for tenant ${tenantId}`,
    );
  },
};

export const logPatient = {
  created: (name: string, tenantId: string) => {
    logger.info(
      {
        event: 'patient_created',
        name,
        tenantId,
        timestamp: new Date().toISOString(),
      },
      `Patient created: ${name}`,
    );
  },

  retrieved: (count: number, tenantId: string) => {
    logger.info(
      {
        event: 'patients_retrieved',
        count,
        tenantId,
        timestamp: new Date().toISOString(),
      },
      `Retrieved ${count} patients for tenant ${tenantId}`,
    );
  },
};

export const logError = {
  general: (error: Error, context?: string) => {
    logger.error(
      {
        event: 'error',
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        context,
        timestamp: new Date().toISOString(),
      },
      `Error occurred: ${error.message}`,
    );
  },

  validation: (errors: any, endpoint: string) => {
    logger.warn(
      {
        event: 'validation_error',
        errors,
        endpoint,
        timestamp: new Date().toISOString(),
      },
      `Validation failed for ${endpoint}`,
    );
  },

  database: (error: Error, operation: string) => {
    logger.error(
      {
        event: 'database_error',
        error: {
          message: error.message,
          stack: error.stack,
        },
        operation,
        timestamp: new Date().toISOString(),
      },
      `Database error in ${operation}: ${error.message}`,
    );
  },
};
