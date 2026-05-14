{
  "apps": [
    {
      "name": "staging-app",
      "script": "npm",
      "args": "start",
      "instances": 1,
      "env": {
        "NODE_ENV": "staging",
        "PORT": 3000
      }
    },
    {
      "name": "production-app",
      "script": "npm",
      "args": "start",
      "instances": 2,
      "env": {
        "NODE_ENV": "production",
        "PORT": 3000
      }
    }
  ]
}