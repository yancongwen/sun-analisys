module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: ['plugin:prettier/recommended', 'prettier/standard', "plugin:vue/essential", "eslint:recommended", "@vue/prettier"],
  parserOptions: {
    parser: "babel-eslint"
  },
  globals: {
    "CONFIG": true
  },
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off"
  }
}
