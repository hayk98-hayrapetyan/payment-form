<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { PaymentStatus } from '@/types';

const route = useRoute();
const router = useRouter();
const status = ref<PaymentStatus>('processing');
const errorMessage = ref('');

const mock3DSAuthentication = (transactionId: string): Promise<{
  status: PaymentStatus;
  error?: string;
}> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const isSuccess = Math.random() > 0.2;

      if (isSuccess) {
        resolve({ status: 'success' });
        rudderanalytics?.track('3DS Mock Authentication Success', {
          transactionId,
          eventTimestamp: new Date().toISOString()
        });
      } else {
        const errorMsg = 'Your bank declined the authentication';
        resolve({
          status: 'failed',
          error: errorMsg
        });
        rudderanalytics?.track('3DS Mock Authentication Failed', {
          transactionId,
          error: errorMsg,
          eventTimestamp: new Date().toISOString()
        });
      }
    }, 4000);
  });
};

onMounted(async () => {
  const transactionId = route.query.transactionId as string;
  const returnUrl = route.query.returnUrl as string || '/';

  if (!transactionId) {
    errorMessage.value = 'Invalid transaction';
    status.value = 'failed';
    return;
  }

  rudderanalytics?.track('3DS Page Loaded', {
    transactionId,
    eventTimestamp: new Date().toISOString()
  });

  try {
    const result = await mock3DSAuthentication(transactionId);

    if (result.status === 'success') {
      status.value = 'success';
      rudderanalytics?.track('3DS Authentication Success', {
        transactionId,
        eventTimestamp: new Date().toISOString()
      });

      setTimeout(() => {
        router.push({
          path: returnUrl,
          query: {
            paymentStatus: 'success',
            transactionId
          }
        });
      }, 4500);
    } else {
      status.value = 'failed';
      errorMessage.value = result.error || 'Authentication failed. Please try another card.';
    }
  } catch (error) {
    status.value = 'failed';
    errorMessage.value = 'Error during authentication';
    rudderanalytics?.track('3DS Authentication Error', {
      transactionId,
      error: String(error),
      eventTimestamp: new Date().toISOString()
    });
  }
});
</script>

<template>
  <div class="three-ds">
    <div v-if="status === 'processing'" class="three-ds__status three-ds__status--processing">
      <h2>Verifying Your Payment</h2>
      <p>Please wait while we authenticate your card with your bank...</p>
      <div class="three-ds__spinner" />
    </div>

    <div v-if="status === 'success'" class="three-ds__status three-ds__status--success">
      <h2>Authentication Successful</h2>
      <p>Your payment has been verified. Redirecting back to the merchant...</p>
    </div>

    <div v-if="status === 'failed'" class="three-ds__status three-ds__status--failed">
      <h2>Authentication Failed</h2>
      <p>{{ errorMessage }}</p>
      <button @click="router.push('/')" class="three-ds__retry-button">
        Return to Payment
      </button>
    </div>
  </div>
</template>

<style scoped>
.three-ds {
  max-width: 500px;
  margin: 2rem auto;
  padding: 2rem;
  text-align: center;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.three-ds__status {
  padding: 1.5rem;
}

.three-ds__status--processing {
  color: #2c7be5;
}

.three-ds__status--success {
  color: #2e7d32;
}

.three-ds__status--failed {
  color: #c62828;
}

.three-ds__spinner {
  margin: 1.5rem auto;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #2c7be5;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.three-ds__retry-button {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background-color: #2c7be5;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;

  &:hover {
    background-color: #1a5fcc;
  }
}
</style>
