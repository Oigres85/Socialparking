// Dichiarazione placeholder per aws-lambda
// Usato da OpenTelemetry per l'instrumentazione AWS Lambda
declare module 'aws-lambda' {
  export interface Context {}
  export interface ProxyHandler<T> {}
}
