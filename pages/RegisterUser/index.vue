<template>
  <div class="flex justify-center items-center h-screen bg-gray-100">
    <UCard class="w-full max-w-2xl p-6 shadow-lg rounded-2xl">
      <h2 class="text-center text-2xl font-semibold text-gray-800 mb-6">
        Create an Account
      </h2>

      <!-- Loading state while checking user status -->
      <div v-if="isCheckingUserStatus" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span class="ml-2 text-gray-600">Checking registration availability...</span>
      </div>

      <!-- Registration not available message -->
      <div v-else-if="isFirstUser === false" class="text-center py-8">
        <div class="text-gray-500 mb-4">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Registration Not Available</h3>
        <p class="text-gray-500 mb-6">User registration is currently disabled. Please contact an administrator to create an account.</p>
        <UButton
          color="primary"
          size="lg"
          @click="goToLogin"
        >
          Go Back to Login
        </UButton>
      </div>

      <form v-else-if="isFirstUser === true" @submit.prevent="handleRegister" class="space-y-4">
        <!-- First Row: Username and Role -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Username Field -->
          <div>
            <label
              for="username"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Username
            </label>
            <UInput
              id="username"
              v-model="username"
              placeholder="Enter your username"
              type="text"
              class="w-full"
              :disabled="isFirstUser !== true"
              required
            />
          </div>

          <!-- Role Field -->
          <div>
            <label
              for="role"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Role
            </label>
            <USelect
              id="role"
              v-model="role"
              :items="roles"
              placeholder="Select a role"
              icon="i-heroicons-user-group"
              class="w-full"
              :disabled="isFirstUser !== true"
              required
            />
          </div>
        </div>

        <!-- Second Row: Email (Full Width) -->
        <div>
          <label
            for="email"
            class="block text-sm font-medium text-gray-700 mb-1"
          >
            Email
          </label>
          <UInput
            id="email"
            v-model="email"
            placeholder="Enter your email"
            type="email"
            class="w-full"
            :disabled="isFirstUser !== true"
            required
          />
        </div>

        <!-- Third Row: Password and Confirm Password -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Password Field -->
          <div>
            <label
              for="password"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <UInput
              id="password"
              v-model="password"
              placeholder="Enter your password"
              :type="showPassword ? 'text' : 'password'"
              class="w-full"
              :ui="{ trailing: 'pe-1' }"
              :disabled="isFirstUser !== true"
              required
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  :icon="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  :aria-pressed="showPassword"
                  aria-controls="password"
                  @click="togglePasswordVisibility"
                  :disabled="isFirstUser !== true"
                />
              </template>
            </UInput>
          </div>

          <!-- Confirm Password Field -->
          <div>
            <label
              for="confirmPassword"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm Password
            </label>
            <UInput
              id="confirmPassword"
              v-model="confirmPassword"
              placeholder="Confirm your password"
              :type="showConfirmPassword ? 'text' : 'password'"
              class="w-full"
              :ui="{ trailing: 'pe-1' }"
              :disabled="isFirstUser !== true"
              required
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  :icon="showConfirmPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                  :aria-label="showConfirmPassword ? 'Hide password' : 'Show password'"
                  :aria-pressed="showConfirmPassword"
                  aria-controls="confirmPassword"
                  @click="toggleConfirmPasswordVisibility"
                  :disabled="isFirstUser !== true"
                />
              </template>
            </UInput>
          </div>
        </div>

        <!-- Password match validation message -->
        <div v-if="confirmPassword && !passwordsMatch" class="text-sm text-red-600 text-center">
          Passwords do not match
        </div>
        <div v-else-if="confirmPassword && passwordsMatch" class="text-sm text-green-600 text-center">
          Passwords match
        </div>

        <!-- Buttons -->
        <div class="flex flex-col sm:flex-row gap-3 pt-2">
          <!-- Go Back to Login Button -->
          <UButton
            color="neutral"
            size="lg"
            class="flex-1 flex justify-center items-center"
            @click="goToLogin"
          >
            Go Back to Login
          </UButton>

          <!-- Register Button -->
          <UButton
            type="submit"
            color="primary"
            size="lg"
            class="flex-1 flex justify-center items-center"
            :loading="isLoading"
            :disabled="isFirstUser !== true || !passwordsMatch || password.length < 6"
          >
            Register
          </UButton>
        </div>

        <!-- Forgot Password Link -->
        <p class="text-center text-sm text-gray-600 mt-3">
          <nuxt-link to="/forgot-password" class="text-primary-600 hover:underline">
            Forgot your password?
          </nuxt-link>
        </p>
      </form>
    </UCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "vue-router";

const config = useRuntimeConfig();
const supabaseUrl = config.public.SUPABASE_URL;
const supabaseAnonKey = config.public.SUPABASE_ANON_KEY;

const client = createClient(supabaseUrl, supabaseAnonKey);

const router = useRouter();
const toast = useToast();
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const isLoading = ref(false);
const username = ref("");
const role = ref("Super Admin");
const roles = ["Super Admin"]; // Only Super Admin option
const isFirstUser = ref(null); // null = checking, true = first user, false = not first user
const superAdminRoleId = ref(null);
const isCheckingUserStatus = ref(true);

// Password visibility states
const showPassword = ref(false);
const showConfirmPassword = ref(false);

// Computed property for password matching validation
const passwordsMatch = computed(() => {
  return password.value === confirmPassword.value && confirmPassword.value !== "";
});

// Password visibility toggle methods
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

const toggleConfirmPasswordVisibility = () => {
  showConfirmPassword.value = !showConfirmPassword.value;
};

// Check if this is the first user and get Super Admin role ID
onMounted(async () => {
  try {
    // Check if any users exist
    const firstUserResponse = await $fetch('/api/users/check-first-user');
    
    if (firstUserResponse && firstUserResponse.success) {
      isFirstUser.value = firstUserResponse.isFirstUser;
    } else {
      throw new Error('Invalid response from first user check API');
    }

    // Get Super Admin role ID
    const superAdminResponse = await $fetch('/api/roles/super-admin');
    
    if (superAdminResponse && superAdminResponse.success) {
      superAdminRoleId.value = superAdminResponse.data.id;
    } else {
      throw new Error('Invalid response from Super Admin role API');
    }

    // No need to set alert here as the template handles the UI state
  } catch (error) {
    console.error("Error checking user status:", error);
    toast.add({
      title: 'Error',
      description: 'Error checking registration availability.',
      icon: 'i-heroicons-exclamation-triangle',
    });
    isFirstUser.value = false; // Set to false on error to show disabled state
  } finally {
    isCheckingUserStatus.value = false;
  }
});

const handleRegister = async () => {
  // Check if this is the first user
  if (isFirstUser.value !== true) {
    toast.add({
      title: 'Error',
      description: 'Registration is not available. Please contact an administrator.',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  // Validate password match
  if (!passwordsMatch.value) {
    toast.add({
      title: 'Error',
      description: 'Passwords do not match. Please check and try again.',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  // Validate password length
  if (password.value.length < 6) {
    toast.add({
      title: 'Error',
      description: 'Password must be at least 6 characters long.',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  isLoading.value = true;

  try {
    const { data: authData, error: authError } = await client.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: {
          username: username.value,
          role: role.value,
        },
      },
    });
    
    if (authError) throw authError;

    // If user was created successfully, create user profile with Super Admin role
    if (authData.user) {
      try {
        const profileResponse = await $fetch('/api/users/create-first-user-profile', {
          method: 'POST',
          body: {
            userId: authData.user.id,
            username: username.value,
          }
        });

        if (profileResponse.success) {
          // User profile created successfully
        }
      } catch (profileError) {
        console.error("Error creating user profile:", profileError);
        // Don't throw error here as user is already created in auth
        toast.add({
          title: 'Warning',
          description: 'User created but profile setup failed. Please contact support.',
          icon: 'i-heroicons-exclamation-triangle',
        });
      }
    }

    // Success Toast
    toast.add({
      title: 'Success!',
      description: 'Registration successful! Please check your email to verify your account.',
      icon: 'i-heroicons-check-circle',
    });
    
    // Clear any previous error states
    isLoading.value = false;
    
    // Redirect after a short delay
    setTimeout(() => {
      // Use nextTick to ensure DOM updates are complete before navigation
      nextTick(() => {
        router.push("/");
      });
    }, 3000);
  } catch (error) {
    // Error Toast
    toast.add({
      title: 'Error',
      description: error.message,
      icon: 'i-heroicons-exclamation-triangle',
    });
  } finally {
    isLoading.value = false;
  }
};

const goToLogin = () => {
  router.push("/");
};
</script>

<style scoped>
/* Styling adjustments for input fields and buttons */
label {
  font-weight: 500;
}

.UInput {
  height: 44px; /* Optimized input field height */
  font-size: 15px; /* Slightly smaller text for better space usage */
}

.UButton {
  height: 44px; /* Match input field height */
  font-size: 15px; /* Uniform font size */
}

/* Optimize card spacing */
.UCard {
  --card-padding: 1.5rem;
}
</style>
