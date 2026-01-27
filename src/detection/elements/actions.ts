export enum ElementAction {
  // Basic interactions
  CLICK = 'click',
  HOVER = 'hover',
  FOCUS = 'focus',
  BLUR = 'blur',

  // Text input actions
  FILL = 'fill',
  TYPE = 'type',
  CLEAR = 'clear',
  APPEND = 'append',
  SELECT_ALL = 'selectAll',

  // Selection actions
  CHECK = 'check',
  UNCHECK = 'uncheck',
  TOGGLE = 'toggle',
  SELECT_OPTION = 'selectOption',
  SELECT_TEXT = 'selectText',

  // Numeric input actions
  INCREMENT = 'increment',
  DECREMENT = 'decrement',

  // File input actions
  SET_FILES = 'setFiles',
  DROP_FILES = 'dropFiles',

  // Picker actions
  OPEN_PICKER = 'openPicker',

  // Navigation actions
  RIGHT_CLICK = 'rightClick',
  MIDDLE_CLICK = 'middleClick',
  KEYBOARD_NAV = 'keyboardNav',

  // Form actions
  SUBMIT = 'submit',
  RESET = 'reset',

  // Container actions
  EXPAND = 'expand',
  COLLAPSE = 'collapse',
  SCROLL = 'scroll',
  RESIZE = 'resize',
}
