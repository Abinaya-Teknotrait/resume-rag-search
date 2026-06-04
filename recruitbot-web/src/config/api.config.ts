/// <reference types="vite/client" />

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/v1';
export const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'RecruitBot';
export const ENABLE_MOCK = import.meta.env.VITE_ENABLE_MOCK === 'true';
