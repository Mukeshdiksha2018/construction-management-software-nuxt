<template>
  <div class="flex items-center gap-2">
    <UAvatar
      v-if="selectedOption?.avatar"
      v-bind="selectedOption.avatar"
      size="xs"
      class="flex-shrink-0"
    />
    <USelectMenu
      v-model="selectedOption"
      :items="options"
      :placeholder="placeholder || 'Select user'"
      :size="size || 'sm'"
      class="flex-1 min-w-0"
      value-key="value"
      searchable
      clearable
      @update:model-value="onChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserProfilesStore } from '@/stores/userProfiles'

interface Props {
  modelValue?: string | null
  placeholder?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  corporationUuid?: string | null
}
const props = defineProps<Props>()
const emit = defineEmits<{
  'update:model-value': [value: string | null]
}>()

const userProfilesStore = useUserProfilesStore()
const { users: allUsers, hasData: hasUsersData } = storeToRefs(userProfilesStore)

const ensureUsersLoaded = async () => {
  const usersList = (allUsers.value as any[]) || []
  const hasUsers = Array.isArray(usersList) && usersList.length > 0
  if (!hasUsersData.value || !hasUsers) {
    try {
      await userProfilesStore.fetchUsers()
    } catch (error) {
      console.error('[UserSelect] Failed to load users:', error)
    }
  }
}

onMounted(() => {
  ensureUsersLoaded()
})

const computeInitials = (user: any) => {
  const segments = [user.firstName, user.lastName]
    .filter((value: any) => typeof value === 'string' && value.trim().length > 0)
    .map((value: string) => value.trim()[0]?.toUpperCase())
    .join('')
  if (segments.length) return segments
  const emailFirst = typeof user.email === 'string' ? user.email.trim()[0] : ''
  return emailFirst ? emailFirst.toUpperCase() : 'U'
}

const corporationUsers = computed(() => {
  const corpUuid = props.corporationUuid
  const list = Array.isArray(allUsers.value) ? allUsers.value : []
  return list.filter((user: any) => {
    if (user.status !== 'active') return false
    if (!corpUuid) return true
    if (!Array.isArray(user.corporationAccess)) return false
    return user.corporationAccess.includes(corpUuid)
  })
})

const options = computed(() =>
  corporationUsers.value.map((user: any) => {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')
    const label = fullName || user.email || 'User'
    const alt = label
    const avatar = user.imageUrl
      ? { src: user.imageUrl, alt, size: 'xs' as const }
      : { alt, text: computeInitials(user), size: 'xs' as const }
    return {
      label,
      value: String(user.id ?? user.email ?? ''),
      description: user.email,
      avatar,
      user,
    }
  })
)

const selectedOption = computed<any>({
  get: () => {
    if (!props.modelValue) return null
    return options.value.find((opt: any) => opt.value === props.modelValue) ?? null
  },
  set: (opt) => {
    onChange(opt)
  },
})

const onChange = (opt: any) => {
  const value =
    typeof opt === 'string'
      ? opt
      : opt?.value
      ? String(opt.value)
      : null
  emit('update:model-value', value)
}
</script>


