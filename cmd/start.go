package cmd

import (
  "github.com/spf13/cobra"
  "github.com/spf13/viper"
  "github.com/bartlettc22/kubeviz-server/server"
)

var listenerPort int
var token string
var s3Bucket string
var s3Key string

func init() {
  startCmd.Flags().IntVarP(&listenerPort, "listener-port", "p", 80, "server listener port")
  viper.BindPFlag("listener_port", startCmd.Flags().Lookup("listener-port"))
  startCmd.Flags().StringVarP(&token, "token", "t", "", "server auth token")
  viper.BindPFlag("token", startCmd.Flags().Lookup("token"))
  startCmd.Flags().StringVarP(&s3Bucket, "s3bucket", "", "", "S3 bucket to post data")
  viper.BindPFlag("s3bucket", startCmd.Flags().Lookup("s3bucket"))
  startCmd.Flags().StringVarP(&s3Key, "s3key", "", "", "S3 Key to post data")
  viper.BindPFlag("s3key", startCmd.Flags().Lookup("s3key"))
  rootCmd.AddCommand(startCmd)
}

var startCmd = &cobra.Command{
  Use:   "start",
  Short: "Start server",
  Long:  `Starts the kubeviz server`,
  Run: func(cmd *cobra.Command, args []string) {
    server.Start(viper.GetInt("listener_port"), viper.GetString("token"), viper.GetString("s3bucket"), viper.GetString("s3key"))
  },
}
