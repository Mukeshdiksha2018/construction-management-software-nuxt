<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="text-center">
        <h2 class="text-3xl font-bold text-gray-900">Complete Your Signup</h2>
        <p class="mt-2 text-sm text-gray-600">
          You've been invited to join our platform. Please complete your profile below to get started.
        </p>
      </div>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <UCard class="py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <form @submit.prevent="handleSignup" class="space-y-6">
          <!-- First Name -->
          <div>
            <label for="firstName" class="block text-sm font-medium text-gray-700">
              First Name <span class="text-red-500">*</span>
            </label>
            <UInput
              id="firstName"
              v-model="form.firstName"
              type="text"
              variant="subtle"
              placeholder="Enter your first name"
              class="mt-1 w-full"
              required
            />
          </div>

          <!-- Last Name -->
          <div>
            <label for="lastName" class="block text-sm font-medium text-gray-700">
              Last Name <span class="text-red-500">*</span>
            </label>
            <UInput
              id="lastName"
              v-model="form.lastName"
              type="text"
              variant="subtle"
              placeholder="Enter your last name"
              class="mt-1 w-full"
              required
            />
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">
              Password <span class="text-red-500">*</span>
            </label>
            <UInput
              id="password"
              v-model="form.password"
              type="password"
              variant="subtle"
              placeholder="Create a password"
              class="mt-1 w-full"
              required
            />
            <p class="mt-1 text-sm text-gray-500">
              Password must be at least 8 characters long
            </p>
          </div>

          <!-- Confirm Password -->
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
              Confirm Password <span class="text-red-500">*</span>
            </label>
            <UInput
              id="confirmPassword"
              v-model="form.confirmPassword"
              type="password"
              variant="subtle"
              placeholder="Confirm your password"
              class="mt-1 w-full"
              required
            />
          </div>

          <!-- Error Message -->
          <div v-if="error" class="mt-4">
            <UAlert
              title="Error"
              :description="error"
              color="error"
              variant="soft"
              icon="lucide:alert-circle"
            />
          </div>

          <!-- Success Message -->
          <div v-if="success" class="mt-4">
            <UAlert
              title="Success"
              :description="success"
              color="success"
              variant="soft"
              icon="lucide:check-circle"
            />
          </div>

          <!-- Submit Button -->
          <div>
            <UButton
              type="submit"
              color="primary"
              size="lg"
              class="w-full flex justify-center"
              :loading="loading"
              :disabled="!isFormValid"
            >
              Complete Signup
            </UButton>
          </div>
        </form>

        <!-- Login Link -->
        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600">
            Already have an account?
            <NuxtLink to="/" class="font-medium text-primary-600 hover:text-primary-500">
              Sign in here
            </NuxtLink>
          </p>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useSupabaseClient } from '~/utils/supabaseClient';
import { useAuthStore } from '~/stores/auth';

definePageMeta({
  layout: false, // No layout for auth pages
});

const router = useRouter();
const route = useRoute();

const form = ref({
  firstName: '',
  lastName: '',
  password: '',
  confirmPassword: ''
});

const loading = ref(false);
const error = ref('');
const success = ref('');

// Check if passwords match
const isFormValid = computed(() => {
  return form.value.firstName.trim() && 
         form.value.lastName.trim() && 
         form.value.password.length >= 8 && 
         form.value.password === form.value.confirmPassword;
});

onMounted(async () => {
  // Initialize Supabase client
  const supabase = useSupabaseClient();

  // Check if user is already authenticated
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    // Check if this user has completed their profile setup using API endpoint
    try {
      const response = await $fetch('/api/users/get-profile', {
        query: {
          userId: session.user.id,
        }
      });

      if (!response.success) {
        throw new Error('Failed to fetch profile');
      }

      const profile = response.data;

      if (!profile) {
        // If no profile found, this might be a new user - let them complete signup
        success.value = 'Welcome! Please complete your profile below to finish setting up your account.';
        return;
      }

      // Check if profile is complete (has name and is active)
      // User must have both first_name, last_name, AND status must be 'active'
      const isProfileComplete = profile.first_name && 
                               profile.last_name && 
                               profile.status === 'active';


      if (isProfileComplete) {
        // Profile is complete, redirect to dashboard
        router.push('/Dashboard');
        return;
      } else {
        // Check if this is an existing user who just needs to update their profile
        // vs a newly invited user who needs to set up their profile
        const isExistingUser = profile.status === 'active' || profile.first_name || profile.last_name;
        
        if (isExistingUser) {
          // This is an existing user with incomplete profile, show update form
          success.value = 'Please update your profile information below.';
        } else {
          // This is a newly invited user, show welcome message
          success.value = 'Welcome! Please complete your profile below to finish setting up your account.';
        }
        return;
      }
    } catch (err) {
      console.error('Error checking user profile:', err);
      // If there's an error, let them complete signup
      success.value = 'Welcome! Please complete your profile below to finish setting up your account.';
      return;
    }
  }

  // Check for Supabase invitation URL format (with tokens in URL fragment)
  const urlParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = urlParams.get('access_token');
  const refreshToken = urlParams.get('refresh_token');
  const tokenType = urlParams.get('token_type');
  const type = urlParams.get('type');

  // Check if this is a Supabase invitation (type=invite)
  if (type === 'invite' && accessToken && refreshToken) {
    try {
      // Set the session in Supabase client
      const { data: sessionResult, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (sessionError) {
        console.error('Error setting session:', sessionError);
        error.value = 'Failed to authenticate. Please try the invitation link again.';
        return;
      }

      if (sessionResult.session) {
        // Update the auth store to reflect the new session
        const authStore = useAuthStore();
        authStore.syncAuthState(sessionResult.session.user);
        
        // Clean up the URL by removing the hash
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        success.value = 'Welcome! Please complete your profile below to finish setting up your account.';
        return;
      }
    } catch (err) {
      console.error('Error in invitation handling:', err);
      error.value = 'Failed to authenticate. Please try the invitation link again.';
      return;
    }
  }

  // Check for callback parameters (from our custom callback)
  const successParam = route.query.success;
  const errorParam = route.query.error;
  const userId = route.query.user_id;

  if (errorParam) {
    error.value = decodeURIComponent(errorParam as string);
    return;
  }

  if (successParam && userId) {
    // This is from our custom callback flow
    const accessToken = route.query.access_token as string;
    const refreshToken = route.query.refresh_token as string;

    if (accessToken && refreshToken) {
      try {
        const { data: sessionResult, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          console.error('Error setting session:', sessionError);
          error.value = 'Failed to authenticate. Please try the invitation link again.';
          return;
        }

        if (sessionResult.session) {
          // Update the auth store to reflect the new session
          const authStore = useAuthStore();
          authStore.syncAuthState(sessionResult.session.user);
          
          // Clean up the URL by removing tokens
          const cleanUrl = window.location.origin + window.location.pathname + '?success=true&user_id=' + userId;
          window.history.replaceState({}, document.title, cleanUrl);
          
          success.value = 'Welcome! Please complete your profile below to finish setting up your account.';
          return;
        }
      } catch (err) {
        console.error('Error in callback handling:', err);
        error.value = 'Failed to authenticate. Please try the invitation link again.';
        return;
      }
    }
  }

  // Check if there are any invitation tokens in the URL (either hash or query params)
  const hasInvitationTokens = (accessToken && refreshToken) || 
                             (route.query.access_token && route.query.refresh_token);

  // If no session and no invitation tokens, show appropriate message
  if (!session && !hasInvitationTokens) {
    // Only show error if there are no invitation tokens at all
    // This prevents showing error when user just visits the page directly
    if (window.location.hash.includes('access_token') || 
        Object.keys(route.query).length > 0) {
      error.value = 'Invalid invitation link. Please check your email for the correct link.';
    } else {
      // If no tokens at all, show a more helpful message
      error.value = 'This page is only accessible through invitation links. Please check your email for the correct invitation link.';
    }
    return;
  }

  // If we get here and there are tokens but no session, there might be an issue
  if (hasInvitationTokens && !session) {
    error.value = 'Failed to process invitation. Please try the invitation link again.';
  }
});

async function handleSignup() {
  if (!isFormValid.value) {
    error.value = 'Please fill in all fields correctly and ensure passwords match.';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const supabase = useSupabaseClient();
    
    // Check if user is already authenticated (from the callback)
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      throw new Error('No active session found. Please use the invitation link from your email.');
    }

    // Use API endpoint to complete signup (handles password update and profile creation/update)
    const response = await $fetch('/api/users/complete-signup', {
      method: 'POST',
      body: {
        userId: session.user.id,
        firstName: form.value.firstName.trim(),
        lastName: form.value.lastName.trim(),
        password: form.value.password,
      }
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to complete signup');
    }

    // Update the auth store to reflect the new user data
    const authStore = useAuthStore();
    await authStore.fetchUser(); // Refresh the user data in the store
    
    // Show success toast notification
    const toast = useToast();
    toast.add({
      title: 'Signup Successful',
      description: 'Signup is successful, please login to continue',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    });
    
    // Redirect to login page after a short delay
    setTimeout(() => {
      // Use nextTick to ensure DOM updates are complete before navigation
      nextTick(() => {
        router.push('/');
      });
    }, 1500);

  } catch (err: any) {
    console.error('Signup error:', err);
    error.value = err.message || err.data?.message || 'An error occurred during signup. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>
