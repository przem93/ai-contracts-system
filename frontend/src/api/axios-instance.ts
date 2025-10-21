import axios, { AxiosRequestConfig } from "axios";

// Get API URL from environment or use default
const getApiUrl = () => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env.VITE_API_URL || "http://localhost:3000";
  }
  return "http://localhost:3000";
};

export const AXIOS_INSTANCE = axios.create({
  baseURL: getApiUrl(),
});

// Custom instance for orval
export const customAxiosInstance = <T>(
  config: AxiosRequestConfig,
): Promise<T> => {
  const source = axios.CancelToken.source();

  const promise = AXIOS_INSTANCE({
    ...config,
    cancelToken: source.token,
  }).then(({ data }) => data);

  // @ts-ignore
  promise.cancel = () => {
    source.cancel("Query was cancelled");
  };

  return promise;
};
