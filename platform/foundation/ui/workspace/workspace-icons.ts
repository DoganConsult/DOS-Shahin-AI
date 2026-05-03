/**
 * Workspace icon registration — runs on whatever IconService instance is
 * injected (fixes carbon-components-angular@5.69.0 DI singleton break in
 * standalone lazy-loaded routes).
 *
 * Idempotent: calling multiple times is safe (registerAll overwrites).
 */
import { IconService } from 'carbon-components-angular/icon';

// Shell chrome
import ChevronDown16 from '@carbon/icons/es/chevron--down/16';
import ChevronUp16 from '@carbon/icons/es/chevron--up/16';
import ChevronLeft16 from '@carbon/icons/es/chevron--left/16';
import ChevronRight16 from '@carbon/icons/es/chevron--right/16';
import ChevronRight20 from '@carbon/icons/es/chevron--right/20';
import ChevronDown20 from '@carbon/icons/es/chevron--down/20';
import ChevronUp20 from '@carbon/icons/es/chevron--up/20';
import Close16 from '@carbon/icons/es/close/16';
import Close20 from '@carbon/icons/es/close/20';
import Close24 from '@carbon/icons/es/close/24';
import CloseFilled16 from '@carbon/icons/es/close--filled/16';
import Menu20 from '@carbon/icons/es/menu/20';
import Search16 from '@carbon/icons/es/search/16';
import Search20 from '@carbon/icons/es/search/20';
import OverflowMenuVertical16 from '@carbon/icons/es/overflow-menu--vertical/16';
import OverflowMenuHorizontal16 from '@carbon/icons/es/overflow-menu--horizontal/16';
import Filter16 from '@carbon/icons/es/filter/16';
import Add16 from '@carbon/icons/es/add/16';
import Subtract16 from '@carbon/icons/es/subtract/16';
import Edit16 from '@carbon/icons/es/edit/16';
import TrashCan16 from '@carbon/icons/es/trash-can/16';
import Download16 from '@carbon/icons/es/download/16';
import Upload16 from '@carbon/icons/es/upload/16';
import CaretDown16 from '@carbon/icons/es/caret--down/16';
import CaretRight16 from '@carbon/icons/es/caret--right/16';
import CaretLeft16 from '@carbon/icons/es/caret--left/16';
import ArrowRight16 from '@carbon/icons/es/arrow--right/16';
import ArrowLeft16 from '@carbon/icons/es/arrow--left/16';

// Status / feedback
import Information16 from '@carbon/icons/es/information/16';
import Information20 from '@carbon/icons/es/information/20';
import Information24 from '@carbon/icons/es/information/24';
import WarningFilled16 from '@carbon/icons/es/warning--filled/16';
import WarningAlt16 from '@carbon/icons/es/warning--alt/16';
import WarningAlt20 from '@carbon/icons/es/warning--alt/20';
import Warning16 from '@carbon/icons/es/warning/16';
import ErrorFilled16 from '@carbon/icons/es/error--filled/16';
import CheckmarkFilled16 from '@carbon/icons/es/checkmark--filled/16';
import CheckmarkFilled20 from '@carbon/icons/es/checkmark--filled/20';
import CheckmarkFilled24 from '@carbon/icons/es/checkmark--filled/24';
import Checkmark16 from '@carbon/icons/es/checkmark/16';
import CheckmarkOutline16 from '@carbon/icons/es/checkmark--outline/16';

// Sidenav / header chrome
import Notification16 from '@carbon/icons/es/notification/16';
import Notification20 from '@carbon/icons/es/notification/20';
import Language20 from '@carbon/icons/es/language/20';
import Asleep20 from '@carbon/icons/es/asleep/20';
import Light20 from '@carbon/icons/es/light/20';
import Logout16 from '@carbon/icons/es/logout/16';
import Logout20 from '@carbon/icons/es/logout/20';
import UserAvatar16 from '@carbon/icons/es/user--avatar/16';
import UserAvatar20 from '@carbon/icons/es/user--avatar/20';
import CircleFilled16 from '@carbon/icons/es/circle--filled/16';
import CircleFilled20 from '@carbon/icons/es/circle--filled/20';
import Home16 from '@carbon/icons/es/home/16';
import Enterprise16 from '@carbon/icons/es/enterprise/16';
import Data2_16 from '@carbon/icons/es/data--2/16';
import Analytics16 from '@carbon/icons/es/analytics/16';
import Application16 from '@carbon/icons/es/application/16';
import CloudServiceManagement16 from '@carbon/icons/es/cloud--service-management/16';
import Category16 from '@carbon/icons/es/category/16';
import Rule16 from '@carbon/icons/es/rule/16';
import Security16 from '@carbon/icons/es/security/16';
import Security20 from '@carbon/icons/es/security/20';
import Document16 from '@carbon/icons/es/document/16';
import Document20 from '@carbon/icons/es/document/20';
import Task16 from '@carbon/icons/es/task/16';
import Book16 from '@carbon/icons/es/book/16';
import ChartBar16 from '@carbon/icons/es/chart--bar/16';
import Dashboard16 from '@carbon/icons/es/dashboard/16';
import Flow16 from '@carbon/icons/es/flow/16';
import Settings16 from '@carbon/icons/es/settings/16';
import User16 from '@carbon/icons/es/user/16';
import Help16 from '@carbon/icons/es/help/16';
import Calendar16 from '@carbon/icons/es/calendar/16';
import Calendar20 from '@carbon/icons/es/calendar/20';
import View16 from '@carbon/icons/es/view/16';
import ViewOff16 from '@carbon/icons/es/view--off/16';

// Workspace-home + ignite-card
import Lightning16 from '@carbon/icons/es/lightning/16';
import Lightning20 from '@carbon/icons/es/lightning/20';
import ChartLine16 from '@carbon/icons/es/chart--line/16';
import RecentlyViewed16 from '@carbon/icons/es/recently-viewed/16';
import MachineLearningModel16 from '@carbon/icons/es/machine-learning-model/16';
import MachineLearningModel20 from '@carbon/icons/es/machine-learning-model/20';
import List16 from '@carbon/icons/es/list/16';
import Renew16 from '@carbon/icons/es/renew/16';
import Launch16 from '@carbon/icons/es/launch/16';
import Idea16 from '@carbon/icons/es/idea/16';
import StarFilled16 from '@carbon/icons/es/star--filled/16';
import Connect16 from '@carbon/icons/es/connect/16';
import Folder16 from '@carbon/icons/es/folder/16';
import FolderOpen16 from '@carbon/icons/es/folder--open/16';

// Dynamic mapping icons (actionIcon / carbonIcon)
import Time16 from '@carbon/icons/es/time/16';
import CloseOutline16 from '@carbon/icons/es/close--outline/16';
import UserAdmin16 from '@carbon/icons/es/user--admin/16';
import CircleDash16 from '@carbon/icons/es/circle-dash/16';
import Group16 from '@carbon/icons/es/group/16';
import Locked16 from '@carbon/icons/es/locked/16';
import DataBase16 from '@carbon/icons/es/data--base/16';

// Mobile / nav
import Activity16 from '@carbon/icons/es/activity/16';
import Activity20 from '@carbon/icons/es/activity/20';
import TaskComplete16 from '@carbon/icons/es/task--complete/16';
import TaskComplete20 from '@carbon/icons/es/task--complete/20';
import DataConnected16 from '@carbon/icons/es/data--connected/16';
import DataConnected20 from '@carbon/icons/es/data--connected/20';
import QrCode16 from '@carbon/icons/es/qr-code/16';
import Camera16 from '@carbon/icons/es/camera/16';
import WifiOff16 from '@carbon/icons/es/wifi--off/16';
import Email32 from '@carbon/icons/es/email/32';

const ALL_ICONS: object[] = [
  // Chrome
  ChevronDown16, ChevronUp16, ChevronLeft16, ChevronRight16, ChevronRight20,
  ChevronDown20, ChevronUp20, Close16, Close20, Close24, CloseFilled16,
  Menu20, Search16, Search20, OverflowMenuVertical16, OverflowMenuHorizontal16,
  Filter16, Add16, Subtract16, Edit16, TrashCan16, Download16, Upload16,
  CaretDown16, CaretRight16, CaretLeft16, ArrowRight16, ArrowLeft16,
  // Status
  Information16, Information20, Information24, WarningFilled16, WarningAlt16,
  WarningAlt20, Warning16, ErrorFilled16, CheckmarkFilled16, CheckmarkFilled20,
  CheckmarkFilled24, Checkmark16, CheckmarkOutline16,
  // Nav
  Notification16, Notification20, Language20, Asleep20, Light20, Logout16,
  Logout20, UserAvatar16, UserAvatar20, CircleFilled16, CircleFilled20,
  Home16, Enterprise16, Data2_16, Analytics16, Application16,
  CloudServiceManagement16, Category16, Rule16, Security16, Security20,
  Document16, Document20, Task16, Book16, ChartBar16, Dashboard16, Flow16,
  Settings16, User16, Help16, Calendar16, Calendar20, View16, ViewOff16,
  // Workspace
  Lightning16, Lightning20, ChartLine16, RecentlyViewed16,
  MachineLearningModel16, MachineLearningModel20, List16, Renew16, Launch16,
  Idea16, StarFilled16, Connect16, Folder16, FolderOpen16,
  // Dynamic
  Time16, CloseOutline16, UserAdmin16, CircleDash16, Group16, Locked16, DataBase16,
  // Mobile
  Activity16, Activity20, TaskComplete16, TaskComplete20, DataConnected16,
  DataConnected20, QrCode16, Camera16, WifiOff16, Email32,
];

export function registerWorkspaceIcons(iconService: IconService): void {
  iconService.registerAll(ALL_ICONS);
}
