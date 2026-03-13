$content = Get-Content "App_clean.jsx"
$fixed = $content -replace "            </div>`r`n          </div>`r`n        </div>`r`n      </div>`r`n    </div>`r`n  );", "            </div>`r`n          </div>`r`n        </div>`r`n      </div>`r`n    </div>`r`n          </div>`r`n  );"
Set-Content "App_clean_fixed.jsx" -Value $fixed
