import { APP_INITIALIZER, EnvironmentProviders, Provider, makeEnvironmentProviders } from '@angular/core';
import { IconService } from 'carbon-components-angular';

import Notification20 from '@carbon/icons/es/notification/20.js';
import Language20 from '@carbon/icons/es/language/20.js';
import Asleep20 from '@carbon/icons/es/asleep/20.js';
import Light20 from '@carbon/icons/es/light/20.js';
import Logout20 from '@carbon/icons/es/logout/20.js';
import UserAvatar20 from '@carbon/icons/es/user--avatar/20.js';
import CircleFilled20 from '@carbon/icons/es/circle--filled/20.js';

import Home16 from '@carbon/icons/es/home/16.js';
import Enterprise16 from '@carbon/icons/es/enterprise/16.js';
import Data2_16 from '@carbon/icons/es/data--2/16.js';
import Analytics16 from '@carbon/icons/es/analytics/16.js';
import Application16 from '@carbon/icons/es/application/16.js';
import CloudServiceManagement16 from '@carbon/icons/es/cloud--service-management/16.js';
import Category16 from '@carbon/icons/es/category/16.js';
import WarningAlt16 from '@carbon/icons/es/warning--alt/16.js';
import Rule16 from '@carbon/icons/es/rule/16.js';
import Security16 from '@carbon/icons/es/security/16.js';
import Document16 from '@carbon/icons/es/document/16.js';
import Task16 from '@carbon/icons/es/task/16.js';
import Book16 from '@carbon/icons/es/book/16.js';
import ChartBar16 from '@carbon/icons/es/chart--bar/16.js';
import Dashboard16 from '@carbon/icons/es/dashboard/16.js';
import Flow16 from '@carbon/icons/es/flow/16.js';
import Settings16 from '@carbon/icons/es/settings/16.js';
import User16 from '@carbon/icons/es/user/16.js';
import Help16 from '@carbon/icons/es/help/16.js';
import CircleFilled16 from '@carbon/icons/es/circle--filled/16.js';

// Carbon-internal chrome icons used by cds-sidenav-menu, cds-header-menu,
// cds-dropdown, cds-overflow-menu, cds-tabs, cds-modal, cds-notification,
// cds-pagination. Without explicit registerAll() these render empty (the
// behaviour visible at /workspace-home where chevrons / close / overflow
// dots were missing).
import ChevronDown16 from '@carbon/icons/es/chevron--down/16.js';
import ChevronUp16 from '@carbon/icons/es/chevron--up/16.js';
import ChevronLeft16 from '@carbon/icons/es/chevron--left/16.js';
import ChevronRight16 from '@carbon/icons/es/chevron--right/16.js';
import ChevronDown20 from '@carbon/icons/es/chevron--down/20.js';
import ChevronUp20 from '@carbon/icons/es/chevron--up/20.js';
import Close16 from '@carbon/icons/es/close/16.js';
import Close20 from '@carbon/icons/es/close/20.js';
import Menu20 from '@carbon/icons/es/menu/20.js';
import Search16 from '@carbon/icons/es/search/16.js';
import Search20 from '@carbon/icons/es/search/20.js';
import OverflowMenuVertical16 from '@carbon/icons/es/overflow-menu--vertical/16.js';
import OverflowMenuHorizontal16 from '@carbon/icons/es/overflow-menu--horizontal/16.js';
import Filter16 from '@carbon/icons/es/filter/16.js';
import Add16 from '@carbon/icons/es/add/16.js';
import Subtract16 from '@carbon/icons/es/subtract/16.js';
import Edit16 from '@carbon/icons/es/edit/16.js';
import TrashCan16 from '@carbon/icons/es/trash-can/16.js';
import Download16 from '@carbon/icons/es/download/16.js';
import Upload16 from '@carbon/icons/es/upload/16.js';
import Information16 from '@carbon/icons/es/information/16.js';
import WarningFilled16 from '@carbon/icons/es/warning--filled/16.js';
import ErrorFilled16 from '@carbon/icons/es/error--filled/16.js';
import CheckmarkFilled16 from '@carbon/icons/es/checkmark--filled/16.js';
import Checkmark16 from '@carbon/icons/es/checkmark/16.js';
import Calendar16 from '@carbon/icons/es/calendar/16.js';
import View16 from '@carbon/icons/es/view/16.js';
import ViewOff16 from '@carbon/icons/es/view--off/16.js';
import CaretDown16 from '@carbon/icons/es/caret--down/16.js';
import CaretRight16 from '@carbon/icons/es/caret--right/16.js';
import CaretLeft16 from '@carbon/icons/es/caret--left/16.js';
import ArrowRight16 from '@carbon/icons/es/arrow--right/16.js';
import ArrowLeft16 from '@carbon/icons/es/arrow--left/16.js';
import Notification16 from '@carbon/icons/es/notification/16.js';
import UserAvatar16 from '@carbon/icons/es/user--avatar/16.js';
import Logout16 from '@carbon/icons/es/logout/16.js';

// Workspace-home + ignite-card icons (added for Carbon migration)
import Lightning16 from '@carbon/icons/es/lightning/16.js';
import Lightning20 from '@carbon/icons/es/lightning/20.js';
import ChartLine16 from '@carbon/icons/es/chart--line/16.js';
import RecentlyViewed16 from '@carbon/icons/es/recently-viewed/16.js';
import MachineLearningModel16 from '@carbon/icons/es/machine-learning-model/16.js';
import Information20 from '@carbon/icons/es/information/20.js';
import Information24 from '@carbon/icons/es/information/24.js';
import List16 from '@carbon/icons/es/list/16.js';
import Renew16 from '@carbon/icons/es/renew/16.js';
import Launch16 from '@carbon/icons/es/launch/16.js';
import Warning16 from '@carbon/icons/es/warning/16.js';
import CheckmarkFilled20 from '@carbon/icons/es/checkmark--filled/20.js';
import Idea16 from '@carbon/icons/es/idea/16.js';
import StarFilled16 from '@carbon/icons/es/star--filled/16.js';
import Connect16 from '@carbon/icons/es/connect/16.js';
import Folder16 from '@carbon/icons/es/folder/16.js';
import Close24 from '@carbon/icons/es/close/24.js';
import CloseFilled16 from '@carbon/icons/es/close--filled/16.js';

export function provideShellIcons(): EnvironmentProviders {
  const providers: Provider[] = [
    // Carbon's IconService isn't `providedIn: 'root'` in this version, so
    // make it available to the root injector before APP_INITIALIZER runs.
    IconService,
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (iconService: IconService) => () => {
        iconService.registerAll([
          Notification20, Language20, Asleep20, Light20, Logout20, UserAvatar20, CircleFilled20,
          Home16, Enterprise16, Data2_16, Analytics16, Application16,
          CloudServiceManagement16, Category16, WarningAlt16, Rule16, Security16,
          Document16, Task16, Book16, ChartBar16, Dashboard16, Flow16, Settings16,
          User16, Help16, CircleFilled16,
          ChevronDown16, ChevronUp16, ChevronLeft16, ChevronRight16,
          ChevronDown20, ChevronUp20,
          Close16, Close20, Menu20, Search16, Search20,
          OverflowMenuVertical16, OverflowMenuHorizontal16, Filter16,
          Add16, Subtract16, Edit16, TrashCan16, Download16, Upload16,
          Information16, WarningFilled16, ErrorFilled16, CheckmarkFilled16, Checkmark16,
          Calendar16, View16, ViewOff16,
          CaretDown16, CaretRight16, CaretLeft16, ArrowRight16, ArrowLeft16,
          Notification16, UserAvatar16, Logout16,
          // Workspace-home + ignite-card icons
          Lightning16, Lightning20, ChartLine16, RecentlyViewed16,
          MachineLearningModel16, Information20, Information24,
          List16, Renew16, Launch16, Warning16,
          CheckmarkFilled20, Idea16, StarFilled16,
          Connect16, Folder16, Close24, CloseFilled16,
        ]);
      },
      deps: [IconService],
    },
  ];
  return makeEnvironmentProviders(providers);
}
