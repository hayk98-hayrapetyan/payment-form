/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    rudderanalytics: {
      load: (writeKey: string, dataPlaneUrl: string) => void
      page: (...args: any[]) => void
      track: (event: string, properties?: Record<string, any>) => void
      identify: (...args: any[]) => void
      reset: () => void
      [key: string]: any
    }
    SecureFields: new () => {
      initTokenize: (merchantId: number, config: Record<string, string>) => void
      on: (event: any, callback: (data: any) => void) => void
      setPlaceholder: (fieldName: string, placeholder: string) => void
      getCardInfo: (callback: () => void) => void
      submit: (data: any) => void
    }
  }
}

declare const rudderanalytics: typeof window.rudderanalytics
declare const SecureFields: typeof window.SecureFields
