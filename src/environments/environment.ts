export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  azure: {
    clientId: '34af23ca-2be7-4f00-93bb-a6e711c38dba',
    tenantId: '7da49cdc-96c1-4342-bf8b-54142c0c27d8',
    authority: 'https://login.microsoftonline.com/7da49cdc-96c1-4342-bf8b-54142c0c27d8',
    redirectUri: 'http://localhost:4200' // debe coincidir con lo configurado con Entra
  }
};
