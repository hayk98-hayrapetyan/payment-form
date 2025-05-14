<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { vMask } from '@opentf/vue-input-mask'
import type {
  PaymentStatus,
  SecureFieldsError,
  SecureFieldsInstance,
  SecureFieldsSubmitOptions,
  SecureFieldsSuccess,
  SecureFieldsValidationResponse,
} from '@/types/index'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const paymentStatus = ref<PaymentStatus>('pending')
const paymentError = ref<string>()
const isRedirecting = ref(false)

const errors = ref<string[]>([])
const cardholderName = ref('')
const expiry = ref('')
const loading = ref(false)

let secureFields: SecureFieldsInstance

const fieldNames = {
  cardNumber: 'Card number',
  cvv: 'CVV',
}

const handleSubmit = () => {
  loading.value = true
  errors.value = []

  rudderanalytics?.track('Form Submission Attempt', {
    cardholderName: cardholderName.value,
    expiry: expiry.value,
    eventTimestamp: new Date().toISOString(),
  })

  if (
    !cardholderName.value ||
    cardholderName.value.length < 2 ||
    !/^[a-zA-Z\s]+$/.test(cardholderName.value)
  ) {
    errors.value.push('Cardholder name is not yet invalid')
  }

  const [monthStr, yearStr] = expiry.value.split('/')
  const month = parseInt(monthStr)
  const year = parseInt(yearStr)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear() % 100

  if (
    !monthStr ||
    !yearStr ||
    isNaN(month) ||
    isNaN(year) ||
    month < 1 ||
    month > 12 ||
    year < currentYear ||
    (year === currentYear && month < currentMonth)
  ) {
    errors.value.push('Expiration date is not yet invalid')
  }

  secureFields!.getCardInfo(() => {
    if (errors.value.length > 0) {
      errors.value.forEach((error) => {
        rudderanalytics?.track('Form Validation Error', {
          reason: error,
        })
      })
    } else {
      secureFields!.submit({
        expm: month,
        expy: year,
        usage: 'SIMPLE',
        '3D': {
          cardholder: {
            cardholderName: cardholderName.value,
            email: 'demo@example.com',
            mobilePhone: { cc: '374', subscriber: '99123456' },
            workPhone: { cc: '374', subscriber: '10123456' },
            homePhone: { cc: '374', subscriber: '11234567' },
          },
        },
      } as SecureFieldsSubmitOptions)
    }

    loading.value = false
  })
}

onMounted(() => {
  if (route.query.paymentStatus === 'success') {
    paymentStatus.value = 'success'
    rudderanalytics?.track('Payment Completed', {
      transactionId: route.query.transactionId,
      eventTimestamp: new Date().toISOString(),
    })
  } else if (route.query.paymentStatus === 'failed') {
    paymentStatus.value = 'failed'
    paymentError.value = route.query.errorMessage?.toString() || 'Payment failed'
    rudderanalytics?.track('Payment Failed', {
      transactionId: route.query.transactionId,
      error: paymentError.value,
      eventTimestamp: new Date().toISOString(),
    })
  }

  if(route.query.paymentStatus){
    router.replace('/')
  }

  secureFields = new SecureFields()

  if (!secureFields) return

  secureFields.initTokenize(1110019698, {
    cardNumber: 'card-number-placeholder',
    cvv: 'cvv-placeholder',
  })

  secureFields.on('ready', () => {
    secureFields!.setPlaceholder('cardNumber', 'Card number')
    secureFields!.setPlaceholder('cvv', 'CVV')

    rudderanalytics?.track('SecureFields Ready', {
      eventTimestamp: new Date().toISOString(),
    })
  })

  secureFields.on('success', (data: SecureFieldsSuccess) => {
    if (data.transactionId) {
      paymentStatus.value = 'processing'
      isRedirecting.value = true

      rudderanalytics?.track('Form Tokenized Successfully', {
        transactionId: data.transactionId,
        cardholderName: cardholderName.value,
        expiry: expiry.value,
        eventTimestamp: new Date().toISOString(),
      })

      rudderanalytics?.track('3DS Redirect Initiated', {
        transactionId: data.transactionId,
        eventTimestamp: new Date().toISOString(),
      })

      router.push({
        path: '/3ds',
        query: {
          transactionId: data.transactionId,
          returnUrl: route.path,
        },
      })
    }
  })

  secureFields.on('error', (error: SecureFieldsError) => {
    paymentStatus.value = 'failed'
    const errorMessage = error?.data?.message || 'Unknown error'

    rudderanalytics?.track('SecureFields Error', {
      message: errorMessage,
      field: error?.field,
      code: error?.code,
      eventTimestamp: new Date().toISOString(),
      cardholderName: cardholderName.value,
    })
  })

  secureFields.on('validate', (event: SecureFieldsValidationResponse) => {
    if (event.hasErrors) {
      Object.keys(event.fields).forEach((fieldName) => {
        if (!event.fields[fieldName as keyof SecureFieldsValidationResponse['fields']].valid) {
          errors.value.push(
            `${fieldNames[fieldName as keyof typeof fieldNames]} is not yet invalid`,
          )
        }
      })
    }
  })
})
</script>

<template>
  <div
    v-if="paymentStatus === 'success'"
    class="payment-form__status payment-form__status--success"
  >
    <p>Payment completed successfully!</p>
  </div>
  <div v-if="paymentStatus === 'failed'" class="payment-form__status payment-form__status--error">
    <p>Payment failed: {{ paymentError }}</p>
  </div>

  <form @submit.prevent="handleSubmit" class="payment-form">
    <h1 class="payment-form__title">Payment page</h1>
    <div>
      <label>Cardholder Name</label>
      <input
        v-model.trim="cardholderName"
        type="text"
        required
        placeholder="Cardholder Name"
        class="payment-form__field"
      />
    </div>

    <div>
      <label>Expiration Date (MM/YY)</label>
      <input
        v-model.trim="expiry"
        v-mask="{ mask: '##/##' }"
        placeholder="MM/YY"
        required
        class="payment-form__field payment-form__field--date"
      />
    </div>

    <div>
      <label>Card Number</label>
      <div id="card-number-placeholder" class="payment-form__field"></div>
    </div>

    <div>
      <label>CVV</label>
      <div id="cvv-placeholder" class="payment-form__field"></div>
    </div>

    <ul class="payment-form__errors" v-if="errors.length">
      <li v-for="(e, index) in errors" :key="index">{{ e }}</li>
    </ul>

    <button class="payment-form__button" :disabled="loading" type="submit">
      {{ loading ? 'Loading...' : 'Submit Payment'}}
    </button>
  </form>
</template>

<style>
.payment-form {
  max-width: 400px;
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 64px 0;
}

.payment-form__title {
  text-align: center;
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 16px;
}

.payment-form__field {
  border: 1px solid #ccc;
  height: 40px;
  padding: 8px;
  display: block;
  width: 100%;
  outline: none;
}

.payment-form__field--date {
  width: 65px;
}

.payment-form__errors {
  list-style: '⚠️';
  list-style-position: inside;
  color: red;
}

.payment-form__button {
  background-color: #2c7be5;
  color: white;
  border: none;
  padding: 10px 16px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: #1a5fcc;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
}

.payment-form__status {
  padding: 15px;
  border-radius: 4px;
  text-align: center;
}

.payment-form__status--success {
  background: #e6f7e6;
  color: #2e7d32;
}

.payment-form__status--error {
  background: #ffebee;
  color: #c62828;
}
</style>
