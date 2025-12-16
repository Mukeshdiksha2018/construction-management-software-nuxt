<template>
  <div class="flex justify-center items-center h-screen bg-gray-100">
    <UCard class="w-full max-w-2xl p-6 shadow-lg rounded-2xl">
      <h2 class="text-center text-2xl font-semibold text-gray-800 mb-6">
        Create an Account
      </h2>

      <form @submit.prevent="handleRegister" class="space-y-4">
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
            :disabled="!passwordsMatch || password.length < 6"
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
const isFirstUser = ref(false);
const checkingFirstUser = ref(true);

// Password visibility states
const showPassword = ref(false);
const showConfirmPassword = ref(false);

// Check if this is the first user on mount
onMounted(async () => {
  try {
    const checkResponse = await $fetch('/api/users/check-first-user');
    isFirstUser.value = checkResponse.isFirstUser;
    
    // If users already exist, redirect to login
    if (!isFirstUser.value) {
      toast.add({
        title: 'Registration Closed',
        description: 'User registration is only available for the first user. Please contact an administrator.',
        icon: 'i-heroicons-exclamation-triangle',
      });
      setTimeout(() => {
        router.push("/");
      }, 2000);
    }
  } catch (error) {
    console.error("Error checking first user:", error);
    toast.add({
      title: 'Error',
      description: 'Unable to verify registration eligibility. Please try again later.',
      icon: 'i-heroicons-exclamation-triangle',
    });
  } finally {
    checkingFirstUser.value = false;
  }
});

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


const handleRegister = async () => {
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

  // Only allow registration if this is the first user
  if (!isFirstUser.value) {
    toast.add({
      title: 'Registration Closed',
      description: 'User registration is only available for the first user.',
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
        // Use the first-user endpoint since we've verified this is the first user
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
