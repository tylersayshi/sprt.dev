#/bin/bash

GOOS=linux GOARCH=amd64 go build -o myapp
scp -i ~/.ssh/droplet myapp root@sprt.dev:/root/sprt-dev

ssh -i ~/.ssh/droplet root@sprt.dev 'sudo systemctl restart sprt-dev.service'

echo 'Shipped! 🚀'
