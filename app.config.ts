export default defineAppConfig({
  // Build-time configuration (evaluated at build time, cannot be overridden)
  build: {
    buildDate: new Date().toISOString(),
    buildEnv: process.env.NODE_ENV || 'development',
    // This is determined at build time and bundled into the app
    baseUrl: "",
  },
  ui: {
    colors: {
      primary: "brand",
      secondary: "slate",
      success: "green",
      info: "blue",
      warning: "amber",
      error: "red",
      neutral: "slate",
    },
    table: {
      slots: {
        root: "relative overflow-auto",
        base: "min-w-full",
        caption: "sr-only",
        thead: "relative bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-t-lg",
        tbody:
          "[&>tr]:hover:bg-gray-50/50 dark:[&>tr]:hover:bg-gray-800/30 [&>tr]:data-[selectable=true]:hover:bg-elevated/50 [&>tr]:data-[selectable=true]:focus-visible:outline-primary",
        tfoot: "relative",
        tr: "data-[selected=true]:bg-elevated/50",
        th: "px-2 py-2 text-sm text-gray-900 dark:text-gray-100 text-center font-bold whitespace-nowrap [&:has([role=checkbox])]:pe-0",
        td: "px-2 py-1 text-xs text-muted whitespace-nowrap [&:has([role=checkbox])]:pe-0",
        separator:
          "absolute z-[1] left-0 w-full h-px bg-(--ui-border-accented)",
        empty: "py-6 text-center text-sm text-muted",
        loading: "py-6 text-center",
      },
      variants: {
        virtualize: {
          false: {
            base: "overflow-clip",
            tbody: "divide-y divide-default",
          },
        },
        pinned: {
          true: {
            th: "sticky bg-gray-100 dark:bg-gray-800/50 data-[pinned=left]:left-0 data-[pinned=right]:right-0",
            td: "sticky data-[pinned=left]:left-0 data-[pinned=right]:right-0",
          },
        },
        sticky: {
          true: {
            thead: "sticky top-0 inset-x-0 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-t-lg z-[1] backdrop-blur",
            tfoot:
              "sticky bottom-0 inset-x-0 bg-default/75 z-[1] backdrop-blur",
          },
          header: {
            thead: "sticky top-0 inset-x-0 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-t-lg z-[1] backdrop-blur",
          },
          footer: {
            tfoot:
              "sticky bottom-0 inset-x-0 bg-default/75 z-[1] backdrop-blur",
          },
        },
        loading: {
          true: {
            thead: "after:absolute after:z-[1] after:h-px",
          },
        },
        loadingAnimation: {
          carousel: "",
          "carousel-inverse": "",
          swing: "",
          elastic: "",
        },
        loadingColor: {
          primary: "",
          secondary: "",
          success: "",
          info: "",
          warning: "",
          error: "",
          neutral: "",
        },
      },
      compoundVariants: [
        {
          loading: true,
          loadingColor: "primary",
          class: {
            thead: "after:bg-primary",
          },
        },
        {
          loading: true,
          loadingColor: "neutral",
          class: {
            thead: "after:bg-inverted",
          },
        },
        {
          loading: true,
          loadingAnimation: "carousel",
          class: {
            thead:
              "after:animate-[carousel_2s_ease-in-out_infinite] rtl:after:animate-[carousel-rtl_2s_ease-in-out_infinite]",
          },
        },
        {
          loading: true,
          loadingAnimation: "carousel-inverse",
          class: {
            thead:
              "after:animate-[carousel-inverse_2s_ease-in-out_infinite] rtl:after:animate-[carousel-inverse-rtl_2s_ease-in-out_infinite]",
          },
        },
        {
          loading: true,
          loadingAnimation: "swing",
          class: {
            thead: "after:animate-[swing_2s_ease-in-out_infinite]",
          },
        },
        {
          loading: true,
          loadingAnimation: "elastic",
          class: {
            thead: "after:animate-[elastic_2s_ease-in-out_infinite]",
          },
        },
      ],
      defaultVariants: {
        loadingColor: "primary",
        loadingAnimation: "carousel",
      },
    },
    tabs: {
      slots: {
        root: "flex items-center gap-2",
        list: "relative flex p-1 group",
        indicator: "absolute transition-[translate,width] duration-200",
        trigger: [
          "group relative inline-flex items-center min-w-0 data-[state=inactive]:text-muted hover:data-[state=inactive]:not-disabled:text-default font-medium rounded-md disabled:cursor-not-allowed disabled:opacity-75",
          "transition-colors",
        ],
        leadingIcon: "shrink-0",
        leadingAvatar: "shrink-0",
        leadingAvatarSize: "",
        label: "truncate",
        trailingBadge: "shrink-0",
        trailingBadgeSize: "sm",
        content: "focus:outline-none w-full",
      },
      variants: {
        color: {
          primary: "",
          secondary: "",
          success: "",
          info: "",
          warning: "",
          error: "",
          neutral: "",
        },
        variant: {
          pill: {
            list: "bg-elevated rounded-lg",
            trigger: "grow",
            indicator: "rounded-md shadow-xs",
          },
          link: {
            list: "border-default",
            indicator: "rounded-full",
            trigger: "focus:outline-none",
          },
        },
        orientation: {
          horizontal: {
            root: "flex-col",
            list: "w-full",
            indicator:
              "left-0 w-(--reka-tabs-indicator-size) translate-x-(--reka-tabs-indicator-position)",
            trigger: "justify-center",
          },
          vertical: {
            list: "flex-col",
            indicator:
              "top-0 h-(--reka-tabs-indicator-size) translate-y-(--reka-tabs-indicator-position)",
          },
        },
        size: {
          xs: {
            trigger: "px-2 py-1 text-xs gap-1",
            leadingIcon: "size-4",
            leadingAvatarSize: "3xs",
          },
          sm: {
            trigger: "px-2.5 py-1.5 text-xs gap-1.5",
            leadingIcon: "size-4",
            leadingAvatarSize: "3xs",
          },
          md: {
            trigger: "px-3 py-1.5 text-sm gap-1.5",
            leadingIcon: "size-5",
            leadingAvatarSize: "2xs",
          },
          lg: {
            trigger: "px-3 py-2 text-sm gap-2",
            leadingIcon: "size-5",
            leadingAvatarSize: "2xs",
          },
          xl: {
            trigger: "px-3 py-2 text-base gap-2",
            leadingIcon: "size-6",
            leadingAvatarSize: "xs",
          },
        },
      },
      compoundVariants: [
        {
          orientation: "horizontal",
          variant: "pill",
          class: {
            indicator: "inset-y-1",
          },
        },
        {
          orientation: "horizontal",
          variant: "link",
          class: {
            list: "border-b -mb-px",
            indicator: "-bottom-px h-px",
          },
        },
        {
          orientation: "vertical",
          variant: "pill",
          class: {
            indicator: "inset-x-1",
            list: "items-center",
          },
        },
        {
          orientation: "vertical",
          variant: "link",
          class: {
            list: "border-s -ms-px",
            indicator: "-start-px w-px",
          },
        },
        {
          color: "primary",
          variant: "pill",
          class: {
            indicator: "bg-primary",
            trigger:
              "data-[state=active]:text-inverted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          },
        },
        {
          color: "secondary",
          variant: "pill",
          class: {
            indicator: "bg-secondary",
            trigger:
              "data-[state=active]:text-inverted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
          },
        },
        {
          color: "success",
          variant: "pill",
          class: {
            indicator: "bg-success",
            trigger:
              "data-[state=active]:text-inverted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success",
          },
        },
        {
          color: "info",
          variant: "pill",
          class: {
            indicator: "bg-info",
            trigger:
              "data-[state=active]:text-inverted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info",
          },
        },
        {
          color: "warning",
          variant: "pill",
          class: {
            indicator: "bg-warning",
            trigger:
              "data-[state=active]:text-inverted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warning",
          },
        },
        {
          color: "error",
          variant: "pill",
          class: {
            indicator: "bg-error",
            trigger:
              "data-[state=active]:text-inverted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error",
          },
        },
        {
          color: "neutral",
          variant: "pill",
          class: {
            indicator: "bg-inverted",
            trigger:
              "data-[state=active]:text-inverted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inverted",
          },
        },
        {
          color: "primary",
          variant: "link",
          class: {
            indicator: "bg-primary",
            trigger:
              "data-[state=active]:text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
          },
        },
        {
          color: "secondary",
          variant: "link",
          class: {
            indicator: "bg-secondary",
            trigger:
              "data-[state=active]:text-secondary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary",
          },
        },
        {
          color: "success",
          variant: "link",
          class: {
            indicator: "bg-success",
            trigger:
              "data-[state=active]:text-success focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-success",
          },
        },
        {
          color: "info",
          variant: "link",
          class: {
            indicator: "bg-info",
            trigger:
              "data-[state=active]:text-info focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-info",
          },
        },
        {
          color: "warning",
          variant: "link",
          class: {
            indicator: "bg-warning",
            trigger:
              "data-[state=active]:text-warning focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-warning",
          },
        },
        {
          color: "error",
          variant: "link",
          class: {
            indicator: "bg-error",
            trigger:
              "data-[state=active]:text-error focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-error",
          },
        },
        {
          color: "neutral",
          variant: "link",
          class: {
            indicator: "bg-inverted",
            trigger:
              "data-[state=active]:text-highlighted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-inverted",
          },
        },
      ],
      defaultVariants: {
        color: "primary",
        variant: "pill",
        size: "md",
      },
    },
    button: {
      slots: {
        base: [
          "rounded-md font-medium inline-flex items-center disabled:cursor-not-allowed aria-disabled:cursor-not-allowed disabled:opacity-75 aria-disabled:opacity-75",
          "transition-colors",
        ],
        label: "truncate",
        leadingIcon: "shrink-0",
        leadingAvatar: "shrink-0",
        leadingAvatarSize: "",
        trailingIcon: "shrink-0",
      },
      variants: {
        fieldGroup: {
          horizontal:
            "not-only:first:rounded-e-none not-only:last:rounded-s-none not-last:not-first:rounded-none focus-visible:z-[1]",
          vertical:
            "not-only:first:rounded-b-none not-only:last:rounded-t-none not-last:not-first:rounded-none focus-visible:z-[1]",
        },
        color: {
          primary: "",
          secondary: "",
          success: "",
          info: "",
          warning: "",
          error: "",
          neutral: "",
        },
        variant: {
          solid: "",
          outline: "",
          soft: "",
          subtle: "",
          ghost: "",
          link: "",
        },
        size: {
          xs: {
            base: "px-2 py-1 text-xs gap-1",
            leadingIcon: "size-4",
            leadingAvatarSize: "3xs",
            trailingIcon: "size-4",
          },
          sm: {
            base: "px-2.5 py-1.5 text-xs gap-1.5",
            leadingIcon: "size-4",
            leadingAvatarSize: "3xs",
            trailingIcon: "size-4",
          },
          md: {
            base: "px-2.5 py-1.5 text-sm gap-1.5",
            leadingIcon: "size-5",
            leadingAvatarSize: "2xs",
            trailingIcon: "size-5",
          },
          lg: {
            base: "px-3 py-2 text-sm gap-2",
            leadingIcon: "size-5",
            leadingAvatarSize: "2xs",
            trailingIcon: "size-5",
          },
          xl: {
            base: "px-3 py-2 text-base gap-2",
            leadingIcon: "size-6",
            leadingAvatarSize: "xs",
            trailingIcon: "size-6",
          },
        },
        block: {
          true: {
            base: "w-full justify-center",
            trailingIcon: "ms-auto",
          },
        },
        square: {
          true: "",
        },
        leading: {
          true: "",
        },
        trailing: {
          true: "",
        },
        loading: {
          true: "",
        },
        active: {
          true: {
            base: "",
          },
          false: {
            base: "",
          },
        },
      },
      compoundVariants: [
        {
          color: "primary",
          variant: "solid",
          class:
            "text-white bg-[#2782EC] hover:bg-[#1f6fd4] active:bg-[#1f6fd4] disabled:bg-[#2782EC] aria-disabled:bg-[#2782EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2782EC] shadow-md hover:shadow-lg transition-all",
        },
        {
          color: "primary",
          variant: "outline",
          class:
            "ring ring-inset ring-primary/50 text-primary hover:bg-primary/10 active:bg-primary/10 disabled:bg-transparent aria-disabled:bg-transparent dark:disabled:bg-transparent dark:aria-disabled:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        },
        {
          color: "primary",
          variant: "soft",
          class:
            "text-primary bg-primary/10 hover:bg-primary/15 active:bg-primary/15 focus:outline-none focus-visible:bg-primary/15 disabled:bg-primary/10 aria-disabled:bg-primary/10",
        },
        {
          color: "primary",
          variant: "subtle",
          class:
            "text-primary ring ring-inset ring-primary/25 bg-primary/10 hover:bg-primary/15 active:bg-primary/15 disabled:bg-primary/10 aria-disabled:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        },
        {
          color: "primary",
          variant: "ghost",
          class:
            "text-primary hover:bg-primary/10 active:bg-primary/10 focus:outline-none focus-visible:bg-primary/10 disabled:bg-transparent aria-disabled:bg-transparent dark:disabled:bg-transparent dark:aria-disabled:bg-transparent",
        },
        {
          color: "primary",
          variant: "link",
          class:
            "text-primary hover:text-primary/75 active:text-primary/75 disabled:text-primary aria-disabled:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
        },
        {
          color: "secondary",
          variant: "solid",
          class:
            "text-white bg-gray-600 hover:bg-gray-700 active:bg-gray-700 disabled:bg-gray-600 aria-disabled:bg-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600",
        },
        {
          color: "secondary",
          variant: "outline",
          class:
            "ring ring-inset ring-gray-300 dark:ring-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-50 dark:active:bg-gray-800 disabled:bg-transparent aria-disabled:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500",
        },
        {
          color: "secondary",
          variant: "soft",
          class:
            "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-700 focus:outline-none focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700 disabled:bg-gray-100 dark:disabled:bg-gray-800 aria-disabled:bg-gray-100 dark:aria-disabled:bg-gray-800",
        },
        {
          color: "secondary",
          variant: "subtle",
          class:
            "text-gray-700 dark:text-gray-300 ring ring-inset ring-gray-300 dark:ring-gray-700 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-700 disabled:bg-gray-100 dark:disabled:bg-gray-800 aria-disabled:bg-gray-100 dark:aria-disabled:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500",
        },
        {
          color: "secondary",
          variant: "ghost",
          class:
            "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-800 focus:outline-none focus-visible:bg-gray-100 dark:focus-visible:bg-gray-800 disabled:bg-transparent aria-disabled:bg-transparent",
        },
        {
          color: "secondary",
          variant: "link",
          class:
            "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 active:text-gray-900 dark:active:text-gray-100 disabled:text-gray-700 dark:disabled:text-gray-300 aria-disabled:text-gray-700 dark:aria-disabled:text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-500",
        },
        {
          color: "neutral",
          variant: "solid",
          class:
            "text-inverted bg-inverted hover:bg-inverted/90 active:bg-inverted/90 disabled:bg-inverted aria-disabled:bg-inverted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inverted",
        },
        {
          color: "neutral",
          variant: "outline",
          class:
            "ring ring-inset ring-accented text-default bg-default hover:bg-elevated active:bg-elevated disabled:bg-default aria-disabled:bg-default focus:outline-none focus-visible:ring-2 focus-visible:ring-inverted",
        },
        {
          color: "neutral",
          variant: "soft",
          class:
            "text-default bg-elevated hover:bg-accented/75 active:bg-accented/75 focus:outline-none focus-visible:bg-accented/75 disabled:bg-elevated aria-disabled:bg-elevated",
        },
        {
          color: "neutral",
          variant: "subtle",
          class:
            "ring ring-inset ring-accented text-default bg-elevated hover:bg-accented/75 active:bg-accented/75 disabled:bg-elevated aria-disabled:bg-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-inverted",
        },
        {
          color: "neutral",
          variant: "ghost",
          class:
            "text-default hover:bg-elevated active:bg-elevated focus:outline-none focus-visible:bg-elevated hover:disabled:bg-transparent dark:hover:disabled:bg-transparent hover:aria-disabled:bg-transparent dark:hover:aria-disabled:bg-transparent",
        },
        {
          color: "neutral",
          variant: "link",
          class:
            "text-muted hover:text-default active:text-default disabled:text-muted aria-disabled:text-muted focus:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-inverted",
        },
        {
          size: "xs",
          square: true,
          class: "p-1",
        },
        {
          size: "sm",
          square: true,
          class: "p-1.5",
        },
        {
          size: "md",
          square: true,
          class: "p-1.5",
        },
        {
          size: "lg",
          square: true,
          class: "p-2",
        },
        {
          size: "xl",
          square: true,
          class: "p-2",
        },
        {
          loading: true,
          leading: true,
          class: {
            leadingIcon: "animate-spin",
          },
        },
        {
          loading: true,
          leading: false,
          trailing: true,
          class: {
            trailingIcon: "animate-spin",
          },
        },
      ],
      defaultVariants: {
        color: "primary",
        variant: "solid",
        size: "md",
      },
    },
    modal: {
      slots: {
        overlay: "backdrop-blur-sm",
        footer:
          "flex items-center justify-end gap-3 px-4 py-3 sm:px-6 sm:py-4 border-t border-default",
        title: "text-lg font-semibold text-default",
        description: "text-sm text-muted mt-1",
      },
    },
  },
});
