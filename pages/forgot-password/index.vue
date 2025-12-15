<template>
  <div class="min-h-screen w-full flex justify-center items-center login-layout-gradient p-4">
    <UCard class="w-full max-w-md p-8 shadow-lg rounded-2xl mx-auto">
      <h2 class="text-center text-2xl font-semibold text-gray-800 mb-6">
        Forgot Your Password?
      </h2>
      
      <p class="text-center text-gray-600 mb-6">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      <!-- Alert Section -->
      <UAlert
        v-if="alertMessage"
        :type="alertType"
        class="mb-4"
        dismissible
        @dismiss="alertMessage = ''"
      >
        {{ alertMessage }}
      </UAlert>

      <form @submit.prevent="handleForgotPassword">
        <!-- Email Field -->
        <div class="mb-6">
          <label
            for="email"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            Email Address
          </label>
          <UInput
            id="email"
            v-model="email"
            placeholder="Enter your email"
            type="email"
            class="w-full"
            required
          />
        </div>

        <!-- Submit Button -->
        <UButton
          type="submit"
          color="primary"
          size="lg"
          class="w-full mt-4 flex justify-center items-center"
          :loading="isLoading"
        >
          Send Reset Link
        </UButton>
      </form>

      <!-- Back to Login Link -->
      <p class="text-center text-sm text-gray-600 mt-6">
        Remember your password?
        <nuxt-link to="/" class="text-primary-600 hover:underline">
          Back to login
        </nuxt-link>
      </p>
    </UCard>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useSupabaseClient } from "@/utils/supabaseClient";

const email = ref("");
const isLoading = ref(false);
const alertMessage = ref("");
const alertType = ref("info");

const handleForgotPassword = async () => {
  if (!email.value) {
    alertType.value = "error";
    alertMessage.value = "Please enter your email address.";
    return;
  }

  isLoading.value = true;
  alertMessage.value = "";

  try {
    // Option 1: Use Supabase client directly (recommended for client-side)
    // Option 2: Use API endpoint (uncomment below if you prefer server-side handling)
    // const res = await $fetch("/api/auth/forgot-password", {
    //   method: "POST",
    //   body: { email: email.value }
    // });
    // if (res.error) throw new Error(res.error);
    
    const supabase = useSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) throw error;

    // Success message
    alertType.value = "success";
    alertMessage.value = "Password reset link has been sent to your email. Please check your inbox and follow the instructions.";
    
    // Clear the form
    email.value = "";
  } catch (error) {
    alertType.value = "error";
    alertMessage.value = error.message || "An error occurred while sending the reset link.";
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
/* Ensure the forgot password container is always centered */
.login-layout-gradient {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  width: 100%;
  position: relative;
}

/* Style adjustments for form fields and button */
label {
  font-weight: 500;
}

.UInput {
  height: 48px; /* Taller input fields */
  font-size: 16px; /* Larger text size */
}

.UButton {
  height: 48px; /* Match input field height */
  font-size: 16px; /* Uniform font size */
}

/* Ensure the card stays centered even on very small screens */
@media (max-width: 640px) {
  .login-layout-gradient {
    padding: 1rem;
  }
  
  .UCard {
    margin: 0 auto;
    width: calc(100% - 2rem);
    max-width: none;
  }
}
</style>
