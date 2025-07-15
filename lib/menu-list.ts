import {
  Tag,
  Users,
  Settings,
  Bookmark,
  SquarePen,
  LayoutGrid,
  LucideIcon
} from "lucide-react";

type Submenu = {
  href: string;
  label: string;
  active?: boolean;
};

type Menu = {
  href: string;
  label: string;
  active?: boolean;
  icon: LucideIcon;
  submenus?: Submenu[];
};

type Group = {
  groupLabel: string;
  menus: Menu[];
};

export function getMenuList(pathname: string): Group[] {
  return [
    {
      groupLabel: "",
      menus: [
        {
          href: "/dashboard",
          label: "Dashboard",
          icon: LayoutGrid,
          submenus: []
        }
      ]
    },
    {
      groupLabel: "Contents",
      menus: [
        {
          href: "",
          label: "Tools",
          icon: SquarePen,
          submenus: [
            {
              href: "/dashboard/tools/price-alert",
              label: "Price Alert"
            },
            {
              href: "/dashboard/tools/auto-order",
              label: "Auto order"
            }
          ]
        },
        {
          href: "/dashboard/strategy-type",
          label: "Types",
          icon: Bookmark
        },
        {
          href: "/dashboard/strategy-chat",
          label: "Strategy",
          icon: Tag
        }
      ]
    },
    {
      groupLabel: "Settings",
      menus: [
        {
          href: "/dashboard/users",
          label: "Users",
          icon: Users
        },
        {
          href: "/dashboard/settings",
          label: "Settings",
          icon: Settings
        }
      ]
    }
  ];
}
