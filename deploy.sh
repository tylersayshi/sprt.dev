#/bin/bash

GOOS=linux GOARCH=amd64 go build -o myapp
sftp -i ~/.ssh/droplet root@sprt.dev <<< 'put myapp sprt-dev'

echo "sudo systemctl restart sprt-dev.service && aws s3 cp s3://tylers-big-bucket/sprt-dev.db /root/sprt-dev.db && echo 'Done!'" | ssh -i ~/.ssh/droplet root@sprt.dev 'bash -s'
