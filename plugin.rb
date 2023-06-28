# frozen_string_literal: true

# name: discourse-polkassembly-auth
# about: Login with Polkassembly
# version: 0.0.1
# authors: Polkassembly
# url: https://github.com/polkassembly/discourse-polkassembly-oauth
# required_version: 2.7.0

enabled_site_setting :discourse_polkassembly_auth_enabled

module ::PolkasseemblyAuth
  PLUGIN_NAME = "discourse_polkassembly_auth"
end

after_initialize do
  # Code which should run after Rails has finished booting
end
