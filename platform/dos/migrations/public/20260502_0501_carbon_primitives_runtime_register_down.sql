-- =====================================================================
-- 0501 DOWN — Remove Carbon UI primitives from dynamic_ui_component_registry.
-- =====================================================================

BEGIN;

DELETE FROM dos.dynamic_ui_component_registry
 WHERE component_key IN (
   -- Tier 1 — Workspace Frame
   'UIShell','Header','HeaderName','HeaderNavigation','HeaderMenu','HeaderMenuItem',
   'HeaderGlobalBar','HeaderGlobalAction',
   'SideNav','SideNavItems','SideNavMenu','SideNavMenuItem','SideNavLink','Content',
   -- Tier 2 — Pages / Cards / Forms / Tables
   'Grid','Column','Layer',
   'Breadcrumb','Tabs','Tab',
   'Tile','ClickableTile','ExpandableTile','Tag',
   'DataTable','TableToolbar','TableToolbarSearch','TableToolbarActions','TableBatchActions',
   'Pagination','StructuredList',
   'Search','Dropdown','ComboBox','MultiSelect','DatePicker',
   'TextInput','TextArea','NumberInput','Select','Checkbox','Radio','Toggle',
   'Button','IconButton','OverflowMenu','OverflowMenuOption',
   'Modal','InlineNotification','ToastNotification',
   -- Tier 3 — Enterprise Polish
   'Tooltip','Toggletip','Popover','ProgressBar','InlineLoading',
   'SkeletonText','SkeletonPlaceholder','ContextMenu','FileUploader','Accordion'
 );

COMMIT;
