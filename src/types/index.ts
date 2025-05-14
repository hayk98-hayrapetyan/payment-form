export interface CardInfo {
  brand: string
  type: string
  usage: string
  country: string
  issuer: string
}

export interface SecureFieldsSuccess {
  transactionId: string
  redirect?: string
  cardInfo?: CardInfo
}

export interface SecureFieldsInstance {
  initTokenize: (merchantId: number, fields: Record<string, string>) => void
  submit: (options: SecureFieldsSubmitOptions) => void
  getCardInfo: (callback: () => void) => void
  setPlaceholder: (field: string, placeholder: string) => void
  on: <T>(event: string, handler: (arg: T) => void) => void
}

export interface SecureFieldsSubmitOptions {
  expm: number
  expy: number
  usage: string
  '3D'?: {
    cardholder: {
      cardholderName: string
      email: string
      mobilePhone?: { cc: string; subscriber: string }
      workPhone?: { cc: string; subscriber: string }
      homePhone?: { cc: string; subscriber: string }
    }
  }
}

export interface SecureFieldsValidationResponse {
  fields: {
    cardNumber: {
      length: number
      valid: boolean
      paymentMethod: string
    }
    cvv: {
      length: number
      valid: boolean
      required: boolean
    }
  }
  hasErrors: boolean
  event: {
    trigger: string
  }
}

export interface SecureFieldsError {
  data?: {
    message?: string
    field?: string
    code?: string
  }
  field?: string
  code?: string
  message?: string
}

export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed'
