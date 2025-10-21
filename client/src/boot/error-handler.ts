import { boot } from 'quasar/wrappers';
import type { App } from 'vue';
import type { AxiosError, AxiosResponse } from 'axios';
import { axiosInstance } from './axios';
import type { ErrorResponse } from 'src/shared/models/error.model';
import { useErrorStore } from 'src/stores/error.store';

const errorStore = useErrorStore();

// Core error handling functions
const handleAxiosError = (error: AxiosError<ErrorResponse>): boolean => {
  const isHandled = false;
  let errorResponse: ErrorResponse;

  if (error.response?.data) {
    errorResponse = error.response.data;
  } else {
    errorResponse = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      details: {
        request: error.request,
        response: error.response,
        config: error.config,
      },
      status: error.response?.status || 500,
      url: error.config?.url || '',
      method: error.config?.method || '',
      headers: error.response?.headers || {},
      body: error.response?.data || {},
    };
  }

  console.error('API Error (errorResponse, error):', errorResponse, error);
  return isHandled;
};

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ErrorResponse> & { isHandled?: boolean }) => {
    if (handleAxiosError(error)) {
      error.isHandled = true;
    } else {
      // Add unhandled errors to the error store
      const errorMessage =
        error.response?.data?.message || error.message || 'An unexpected axios error occurred';
      errorStore.addError(errorMessage);
      error.isHandled = true;
    }
    return Promise.reject(error);
  },
);

// Vue error handling plugin
const errorHandlerPlugin = {
  install: (app: App) => {
    // Handle Vue component errors
    app.config.errorHandler = (error, instance, info) => {
      console.error('Vue Error (error, instance, info):', error, instance, info);
      if (error instanceof Error) {
        errorStore.addError(error.message);
      } else if (error instanceof Object) {
        errorStore.addError(JSON.stringify(error));
      } else {
        errorStore.addError(String(error));
      }
    };

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason instanceof Error && 'isHandled' in event.reason && event.reason.isHandled) {
        event.preventDefault();
        return;
      }
      console.error('Unhandled Promise Rejection (event.reason):', event.reason);
      errorStore.addError(event.reason);
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('Global Error (event):', event);
      errorStore.addError(event.message);
    });
  },
};

// Boot installation
export default boot(({ app }) => {
  // Install Vue error handler plugin
  app.use(errorHandlerPlugin);
});
