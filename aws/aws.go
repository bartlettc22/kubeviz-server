package aws

import (
  "bytes"
  "github.com/aws/aws-sdk-go/aws"
  "github.com/aws/aws-sdk-go/aws/awserr"
  "github.com/aws/aws-sdk-go/aws/session"
  "github.com/aws/aws-sdk-go/service/s3"
  log "github.com/Sirupsen/logrus"
)

var s3Client *s3.S3

func init() {
  sess := session.Must(session.NewSession(&aws.Config{
	   Region: aws.String("us-east-1"),
  }))
  s3Client = s3.New(sess)
}

func PostToS3(postData []byte, s3Bucket string, s3Key string) {

  putObjectInput := s3.PutObjectInput{
    Bucket:      aws.String(s3Bucket),
    Key:         &s3Key,
    Body:        bytes.NewReader(postData),
    ContentType: aws.String("application/json"),
  }

  _, err := s3Client.PutObject(&putObjectInput)

  if err != nil {
    if aerr, ok := err.(awserr.Error); ok {
      log.Warn(aerr.Code())
    }
    log.Warn("Error uploading stats to S3; ", err)
    return 
  }

  log.Info("Successfully posted data to s3: ", s3Bucket, "/", s3Key)
}
