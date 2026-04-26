export type SecurityRuleContext = {
    path: string;
    operation: 'get' | 'list' | 'create' | 'update' | 'delete';
    requestResourceData?: any;
  };
  
  export class FirestorePermissionError extends Error {
    constructor(public context: SecurityRuleContext) {
      super(`FirestoreError: Missing or insufficient permissions.`);
      this.name = 'FirestorePermissionError';
      this.message = `${this.message} The following request was denied by Firestore Security Rules:\n${JSON.stringify(this.context, null, 2)}`;
    }
  }
  