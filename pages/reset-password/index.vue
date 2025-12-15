<template>
  <div class="min-h-screen w-full flex justify-center items-center login-layout-gradient p-4">
    <UCard class="w-full max-w-md p-8 shadow-lg rounded-2xl mx-auto">
      <h2 class="text-center text-2xl font-semibold text-gray-800 mb-6">
        Reset Your Password
      </h2>
      
      <p class="text-center text-gray-600 mb-6">
        Enter your new password below.
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

      <form @submit.prevent="handleResetPassword">
        <!-- New Password Field -->
        <div class="mb-6">
          <label
            for="newPassword"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            New Password
          </label>
          <UInput
            id="newPassword"
            v-model="newPassword"
            placeholder="Enter new password"
            type="password"
            class="w-full"
            required
            minlength="8"
          />
          <p class="text-xs text-gray-500 mt-1">
            Password must be at least 8 characters long with lowercase, uppercase, and number
          </p>
          <!-- Password Strength Indicator -->
          <div v-if="newPassword.length > 0" class="mt-2">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs text-gray-600">Strength:</span>
              <span :class="`text-xs font-medium ${passwordStrength.color}`">
                {{ passwordStrength.label }}
              </span>
            </div>
            <div class="flex gap-1">
              <div 
                v-for="i in 5" 
                :key="i"
                :class="`h-1 flex-1 rounded ${
                  i <= passwordStrength.score + 1 
                    ? passwordStrength.color.replace('text-', 'bg-') 
                    : 'bg-gray-200'
                }`"
              ></div>
            </div>
          </div>
        </div>

        <!-- Confirm Password Field -->
        <div class="mb-6">
          <label
            for="confirmPassword"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            Confirm New Password
          </label>
          <UInput
            id="confirmPassword"
            v-model="confirmPassword"
            placeholder="Confirm new password"
            type="password"
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
          :disabled="!isFormValid"
        >
          Reset Password
        </UButton>
      </form>

      <!-- Back to Login Link -->
      <p class="text-center text-sm text-gray-600 mt-6">
        <nuxt-link to="/" class="text-primary-600 hover:underline">
          Back to login
        </nuxt-link>
      </p>
    </UCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { useSupabaseClient } from "@/utils/supabaseClient";

const router = useRouter();
const route = useRoute();
const supabase = useSupabaseClient();
const newPassword = ref("");
const confirmPassword = ref("");
const isLoading = ref(false);
const alertMessage = ref("");
const alertType = ref("info");
const isSessionReady = ref(false);

// Check if passwords match and meet requirements
const isFormValid = computed(() => {
  return newPassword.value.length >= 8 && 
         confirmPassword.value.length >= 8 && 
         newPassword.value === confirmPassword.value &&
         /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword.value); // At least one lowercase, uppercase, and digit
});

// Password strength indicator
const passwordStrength = computed(() => {
  const password = newPassword.value;
  if (password.length === 0) return { score: 0, label: '', color: 'text-gray-400' };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['text-red-500', 'text-orange-500', 'text-yellow-500', 'text-blue-500', 'text-green-500'];
  
  return {
    score: Math.min(score, 4),
    label: labels[Math.min(score, 4)],
    color: colors[Math.min(score, 4)]
  };
});

onMounted(async () => {
  // First, check for hash fragment (Supabase puts tokens in URL hash)
  if (window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');
    
    // If this is a password recovery link (type=recovery)
    if (type === 'recovery' && accessToken && refreshToken) {
      try {
        const { data: sessionResult, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          console.error('Error setting session from hash:', sessionError);
          alertType.value = "error";
          alertMessage.value = 'Failed to authenticate. Please try the reset link again.';
          setTimeout(() => {
            router.push('/forgot-password');
          }, 3000);
          return;
        }

        if (sessionResult.session) {
          // Clean up the URL by removing hash
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
          
          isSessionReady.value = true;
          alertType.value = "success";
          alertMessage.value = "Please enter your new password below.";
          return;
        }
      } catch (err) {
        console.error('Error in hash handling:', err);
        alertType.value = "error";
        alertMessage.value = 'Failed to authenticate. Please try the reset link again.';
        setTimeout(() => {
          router.push('/forgot-password');
        }, 3000);
        return;
      }
    }
  }
  
  // Check for callback parameters (from our custom callback)
  const success = route.query.success;
  const errorParam = route.query.error;
  const userId = route.query.user_id;

  if (errorParam) {
    alertType.value = "error";
    alertMessage.value = decodeURIComponent(String(errorParam));
    // Redirect to forgot password page after a delay
    setTimeout(() => {
      nextTick(() => {
        router.push('/forgot-password');
      });
    }, 3000);
    return;
  }

  if (success && userId) {
    // This is from our custom callback flow
    const accessToken = String(route.query.access_token || '');
    const refreshToken = String(route.query.refresh_token || '');

    if (accessToken && refreshToken) {
      try {
        const { data: sessionResult, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          console.error('Error setting session:', sessionError);
          alertType.value = "error";
          alertMessage.value = 'Failed to authenticate. Please try the reset link again.';
          setTimeout(() => {
            router.push('/forgot-password');
          }, 3000);
          return;
        }

        if (sessionResult.session) {
          // Clean up the URL by removing tokens
          const cleanUrl = window.location.origin + window.location.pathname + '?success=true&user_id=' + userId;
          window.history.replaceState({}, document.title, cleanUrl);
          
          isSessionReady.value = true;
          alertType.value = "success";
          alertMessage.value = "Please enter your new password below.";
          return;
        }
      } catch (err) {
        console.error('Error in callback handling:', err);
        alertType.value = "error";
        alertMessage.value = 'Failed to authenticate. Please try the reset link again.';
        setTimeout(() => {
          router.push('/forgot-password');
        }, 3000);
        return;
      }
    }
  }

  // Check if user is already authenticated (should be after clicking email link)
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    alertType.value = "error";
    alertMessage.value = "Invalid or expired reset link. Please request a new password reset.";
    // Redirect to forgot password page after a delay
    setTimeout(() => {
      nextTick(() => {
        router.push('/forgot-password');
      });
    }, 3000);
    return;
  }

  // Session exists, user is ready to reset password
  isSessionReady.value = true;
  alertType.value = "success";
  alertMessage.value = "Please enter your new password below.";
});

const handleResetPassword = async () => {
  if (!isFormValid.value) {
    alertType.value = "error";
    alertMessage.value = "Please ensure passwords match and are at least 8 characters long.";
    return;
  }

  // Check if session is ready
  if (!isSessionReady.value) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alertType.value = "error";
      alertMessage.value = "Session expired. Please request a new password reset link.";
      setTimeout(() => {
        router.push('/forgot-password');
      }, 3000);
      return;
    }
    isSessionReady.value = true;
  }

  isLoading.value = true;
  alertMessage.value = "";

  try {
    // Verify we have a session before updating password
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("No active session. Please request a new password reset link.");
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword.value
    });

    if (error) throw error;

    // Success message
    alertType.value = "success";
    alertMessage.value = "Password has been successfully reset! Redirecting to login...";
    
    // Clear the form
    newPassword.value = "";
    confirmPassword.value = "";
    
    // Sign out the user after password reset (optional, but recommended)
    await supabase.auth.signOut();
    
    // Redirect to login page after a delay
    setTimeout(() => {
      nextTick(() => {
        router.push('/');
      });
    }, 2000);
  } catch (error) {
    console.error('Password reset error:', error);
    alertType.value = "error";
    alertMessage.value = error.message || "An error occurred while resetting your password. Please try again.";
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
/* Ensure the reset password container is always centered */
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
