#/bin/bash

GOOS=linux GOARCH=amd64 go build -o myapp
sftp -i ~/.ssh/droplet root@sprt.dev <<< 'put myapp sprt-dev'

ssh -i ~/.ssh/droplet root@sprt.dev 'sudo systemctl restart sprt-dev.service'

echo 'Shipped! 🚀'
