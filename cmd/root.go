package cmd

import (
  "fmt"
  "os"
  "github.com/spf13/cobra"
  "github.com/spf13/viper"
)

var rootCmd = &cobra.Command{
  Use:   "kubeviz-server",
  Short: "Kubernetes visualization server",
  Long: `Server side of kubeviz implementation. Documentation is available at https://github.com/bartlettc22/kubeviz-server`,
  Run: func(cmd *cobra.Command, args []string) {
    // Do Stuff Here
  },
}

func init() {
  viper.SetEnvPrefix("KUBEVIZ")
  viper.AutomaticEnv()
}

func Execute() {
  if err := rootCmd.Execute(); err != nil {
    fmt.Println(err)
    os.Exit(1)
  }
}
