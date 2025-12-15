<template>
  <div class="h-screen w-full overflow-hidden transition-all duration-500"
       :class="isDark ? 'bg-gradient-to-br from-gray-900 via-brand-950 to-gray-900' : 'bg-gradient-to-br from-slate-50 to-slate-200'"
       :style="isDark ? 'background: linear-gradient(135deg, #111827 0%, #1a2532 25%, #25364a 50%, #1a2532 75%, #111827 100%);' : ''">
    <!-- Mobile: Single column layout, Desktop: Two column layout -->
    <div class="flex flex-col lg:flex-row h-full">
      <!-- Logo section - hidden on mobile, visible on desktop -->
      <div class="hidden lg:flex flex-1 items-center justify-center">
        <div class="text-center">
          <!-- Placeholder for logo - replace with your actual logo component -->
          <div class="w-32 h-32 rounded-full flex items-center justify-center mb-4 mx-auto transition-all duration-300"
               :class="isDark ? 'bg-gradient-to-br from-brand-600 to-brand-700 shadow-2xl shadow-brand-500/30 ring-2 ring-brand-400/20' : 'bg-brand-100 shadow-lg'">
            <UIcon name="i-heroicons-building-office-2" 
                   :class="isDark ? 'w-16 h-16 text-white drop-shadow-lg' : 'w-16 h-16 text-brand-600'" />
          </div>
          <h1 class="text-3xl font-bold mb-2 transition-colors duration-300"
              :class="isDark ? 'text-white drop-shadow-lg' : 'text-gray-800'">Nimble Suite</h1>
          <p class="transition-colors duration-300"
             :class="isDark ? 'text-brand-200' : 'text-gray-600'">Manage your properties with ease</p>
        </div>
      </div>
      
      <!-- Mobile logo - smaller and centered -->
      <div class="lg:hidden flex justify-center pt-6 pb-3">
        <div class="text-center">
          <div class="w-16 h-16 rounded-full flex items-center justify-center mb-2 mx-auto transition-all duration-300"
               :class="isDark ? 'bg-gradient-to-br from-brand-600 to-brand-700 shadow-xl shadow-brand-500/30 ring-2 ring-brand-400/20' : 'bg-brand-100 shadow-lg'">
            <UIcon name="i-heroicons-building-office-2" 
                   :class="isDark ? 'w-8 h-8 text-white drop-shadow-lg' : 'w-8 h-8 text-brand-600'" />
          </div>
          <h1 class="text-lg font-bold mb-1 transition-colors duration-300"
              :class="isDark ? 'text-white drop-shadow-lg' : 'text-gray-800'">Nimble Suite</h1>
          <p class="text-xs transition-colors duration-300"
             :class="isDark ? 'text-brand-200' : 'text-gray-600'">Manage your properties with ease</p>
        </div>
      </div>
      
      <!-- Login form section -->
      <div class="flex-1 flex items-center justify-center px-4 pb-6 lg:pb-0 relative">
        <!-- Dark Mode Toggle Button -->
        <div class="absolute top-4 right-4 z-10">
          <UButton
            :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
            variant="soft"
            size="sm"
            :color="isDark ? 'primary' : 'neutral'"
            @click="toggleDarkMode"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            :class="[
              'transition-all duration-300 hover:scale-110',
              isDark ? 'text-yellow-300 bg-gradient-to-br from-brand-600/20 to-brand-700/20 border border-brand-400/30 backdrop-blur-sm shadow-lg shadow-brand-500/20' : ''
            ]"
          />
        </div>
        
        <UCard class="w-full max-w-md p-6 lg:p-8 rounded-2xl transition-all duration-500"
                :class="isDark ? 'bg-gradient-to-br from-gray-800/90 via-gray-900/80 to-gray-800/90 backdrop-blur-xl shadow-2xl shadow-brand-900/50 border border-brand-500/20 ring-1 ring-brand-400/10' : 'shadow-lg bg-white'">
          <h2 class="text-center text-2xl font-semibold mb-6 transition-colors duration-300"
              :class="isDark ? 'text-white drop-shadow-sm' : 'text-gray-800'">
            Login to Your Account
          </h2>
      <form @submit.prevent="handleSubmit">
        <!-- Email Field -->
        <div class="mb-6">
          <label
            for="email"
            class="block text-sm font-medium mb-2 transition-colors duration-300"
            :class="isDark ? 'text-brand-200' : 'text-gray-700'"
          >
            Email
          </label>
          <UInput
            id="email"
            v-model="email"
            placeholder="Enter your email"
            type="email"
            variant="outline"
            :color="isDark ? 'gray' : 'primary'"
            size="lg"
            :class="[
              'w-full transition-all duration-300',
              isDark ? 'bg-gray-800/60 border-brand-500/30 text-white placeholder-brand-300/70 focus:border-brand-400/50 focus:ring-brand-400/20' : ''
            ]"
            required
          />
        </div>

        <!-- Password Field -->
        <div class="mb-6">
          <label
            for="password"
            class="block text-sm font-medium mb-2 transition-colors duration-300"
            :class="isDark ? 'text-brand-200' : 'text-gray-700'"
          >
            Password
          </label>
          <UInput
            id="password"
            v-model="password"
            placeholder="Enter your password"
            :type="showPassword ? 'text' : 'password'"
            variant="outline"
            :color="isDark ? 'gray' : 'primary'"
            size="lg"
            :class="[
              'w-full transition-all duration-300',
              isDark ? 'bg-gray-800/60 border-brand-500/30 text-white placeholder-brand-300/70 focus:border-brand-400/50 focus:ring-brand-400/20' : ''
            ]"
            :ui="{ trailing: 'pe-1' }"
            required
          >
            <template #trailing>
              <UButton
                :color="isDark ? 'gray' : 'neutral'"
                variant="link"
                size="sm"
                :icon="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                :aria-pressed="showPassword"
                aria-controls="password"
                :class="isDark ? 'text-brand-300 hover:text-brand-100' : ''"
                @click="togglePasswordVisibility"
              />
            </template>
          </UInput>
        </div>
        
        <!-- Error Message -->
        <div v-if="errMessage" class="mb-4">
          <p class="text-sm text-center transition-colors duration-300"
             :class="isDark ? 'text-red-300' : 'text-red-500'">{{ errMessage }}</p>
        </div>
        
        <!-- Submit Button -->
        <UButton
          type="submit"
          :color="isDark ? 'primary' : 'primary'"
          size="lg"
          :class="[
            'w-full flex justify-center items-center transition-all duration-300',
            isDark ? 'bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 shadow-lg shadow-brand-500/30 ring-2 ring-brand-400/20' : ''
          ]"
          :loading="isLoading"
        >
          Login
        </UButton>
      </form>

      <!-- Forgot Password Link -->
      <p class="text-center text-sm mt-4 transition-colors duration-300"
         :class="isDark ? 'text-brand-300' : 'text-gray-600'">
        <nuxt-link to="/forgot-password" 
                   :class="isDark ? 'text-brand-400 hover:text-brand-300 hover:underline transition-colors duration-200' : 'text-brand-600 hover:underline'">
          Forgot your password?
        </nuxt-link>
      </p>

      <!-- Register Link -->
      <p class="text-center text-sm mt-6 transition-colors duration-300"
         :class="isDark ? 'text-brand-300' : 'text-gray-600'">
        Don't have an account?
        <nuxt-link to="/registeruser" 
                   :class="isDark ? 'text-brand-400 hover:text-brand-300 hover:underline transition-colors duration-200' : 'text-brand-600 hover:underline'">
          Register here
        </nuxt-link>
      </p>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useSupabaseClient } from "@/utils/supabaseClient";
import { useDarkMode } from "@/composables/useDarkMode";

// Define page meta to use no layout for login page
definePageMeta({
  layout: false
});

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { isDark, toggleDarkMode, initializeTheme, watchSystemTheme } = useDarkMode();

const email = ref("");
const password = ref("");
const isLoading = ref(false);
const errMessage = ref(null);
const showPassword = ref(false);

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

// Check for invitation tokens on page load and redirect to signup
onMounted(() => {
  // Initialize dark mode
  initializeTheme();
  watchSystemTheme();
  
  // Check for Supabase invitation tokens in URL hash or query params
  const urlParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = urlParams.get('access_token');
  const refreshToken = urlParams.get('refresh_token');
  const type = urlParams.get('type');
  
  // Check query params as fallback
  const queryAccessToken = route.query.access_token;
  const queryRefreshToken = route.query.refresh_token;
  const queryType = route.query.type;
  
  // If this is an invitation with tokens (with or without type=invite), redirect to signup
  // The type param might not always be present in custom redirect URLs
  if ((accessToken && refreshToken) || (queryAccessToken && queryRefreshToken)) {
    console.log('Invitation detected, redirecting to signup page');
    // Preserve the hash fragment when redirecting
    if (window.location.hash) {
      window.location.href = '/auth/signup' + window.location.hash;
    } else if (queryAccessToken && queryRefreshToken) {
      router.push(`/auth/signup?access_token=${queryAccessToken}&refresh_token=${queryRefreshToken}`);
    }
    return;
  }
});

const handleSubmit = async () => {
  isLoading.value = true;
  errMessage.value = null;
  try {
    // Use client-side Supabase client for authentication
    // This ensures the session is properly stored in localStorage
    const supabase = useSupabaseClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });
    
    if (error) throw new Error(error.message);
    
    // Update the auth store with the user data
    authStore.user = data.user;
    authStore.isInitialized = true;
    
    // Navigate to dashboard (uppercase to match middleware)
    await router.push("/Dashboard");
  } catch (error) {
    errMessage.value = error.message || 'Login failed. Please try again.';
  } finally {
    isLoading.value = false;
  }
};
</script>

